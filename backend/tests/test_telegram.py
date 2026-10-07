"""Offline Telegram integration tests: real SQLite, mocked Telegram and AI."""
from datetime import datetime, timedelta, timezone
import unittest
from unittest.mock import patch
from types import SimpleNamespace
from app.models.memory import LearningMemory, TutorTurn
from app.services.telegram_learning import telegram_reply, generate_daily
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.config import settings
from app.db.session import Base, get_db
from app.models import profile, memory, topic
from app.models.telegram import TelegramConnection, TelegramDaily, TelegramUpdate
from app.models.quiz import QuizAttempt
from app.models.user import User
from app.routers import telegram
from app.routers.auth import get_current_user
from app.schemas.telegram import DailyLesson
from app.services.telegram_api import TelegramError
from app.services.telegram_worker import enqueue_daily, next_due, utcnow, work_daily, work_update


class TelegramTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        self.db = self.sessions()
        self.db.add_all([User(id=i, name=f'Student {i}', email=f's{i}@example.com', hashed_password='test') for i in (1, 2)])
        self.db.commit()
        self.user_id = 1
        app = FastAPI(); app.include_router(telegram.router)
        def session():
            with self.sessions() as db:
                yield db
        app.dependency_overrides[get_db] = session
        app.dependency_overrides[get_current_user] = lambda: self.db.get(User, self.user_id)
        self.client = TestClient(app)
        for key, value in {'telegram_enabled': True, 'telegram_process_inline': False, 'telegram_bot_token': 'test-token', 'telegram_bot_username': 'TestBot',
                           'telegram_webhook_secret': 'webhook-secret', 'cron_secret': 'cron-secret'}.items():
            p = patch.object(settings, key, value); p.start(); self.addCleanup(p.stop)
        p = patch('app.services.telegram_worker.telegram_call', return_value={'message_id': 1})
        self.sent = p.start(); self.addCleanup(p.stop)
        self.addCleanup(self.engine.dispose); self.addCleanup(self.db.close); self.addCleanup(self.client.close)

    def post(self, text, update_id=1, chat_id=101, private=True):
        return self.client.post('/api/telegram/webhook', headers={'X-Telegram-Bot-Api-Secret-Token': 'webhook-secret'}, json={
            'update_id': update_id, 'message': {'chat': {'id': chat_id, 'type': 'private' if private else 'group'},
                                              'from': {'id': chat_id, 'username': 'student'}, 'text': text}})

    def process(self):
        with self.sessions() as db:
            while work_update(db):
                pass

    def link(self, chat_id=101):
        result = self.client.post('/api/telegram/link')
        self.assertEqual(result.status_code, 200, result.text)
        token = result.json()['url'].split('start=')[1]
        self.assertEqual(self.post('/start ' + token, chat_id=chat_id).status_code, 200)
        self.process()
        return token

    def connect(self):
        self.link()
        response = self.client.post('/api/telegram/confirm', json={'daily_enabled': True})
        self.assertEqual(response.status_code, 200, response.text)

    def lesson(self):
        return DailyLesson(subject='Mathematics', topic='Pythagorean theorem', difficulty='Easy', fact='A 3-4-5 triangle is right angled.',
            questions=[{'prompt': f'Question {i}: 3 squared?', 'options': ['9', '6'], 'correct_index': 0,
                        'explanation': '3 times 3 equals 9.'} for i in range(5)])

    def test_link_requires_website_confirmation_and_is_single_use(self):
        token = self.link()
        status = self.client.get('/api/telegram/status').json()
        self.assertFalse(status['connected']); self.assertEqual(status['pending']['chat_id'], '101')
        self.post('/start ' + token, update_id=2, chat_id=202); self.process()
        self.assertEqual(self.client.get('/api/telegram/status').json()['pending']['chat_id'], '101')
        self.user_id = 2
        self.assertEqual(self.client.post('/api/telegram/confirm', json={}).status_code, 409)
        self.user_id = 1
        self.assertTrue(self.client.post('/api/telegram/confirm', json={}).json()['connected'])
        self.assertFalse(self.client.get('/api/telegram/status').json()['daily_enabled'])

    def test_expired_link_and_cross_account_connection(self):
        token = self.client.post('/api/telegram/link').json()['url'].split('start=')[1]
        conn = self.db.get(TelegramConnection, 1); conn.link_expires_at = utcnow() - timedelta(seconds=1); self.db.commit()
        self.post('/start ' + token); self.process()
        self.assertIsNone(self.client.get('/api/telegram/status').json()['pending'])
        conn.chat_id = 101; self.db.commit()
        self.user_id = 2
        token = self.client.post('/api/telegram/link').json()['url'].split('start=')[1]
        self.post('/start ' + token, update_id=2); self.process()
        self.assertEqual(self.client.post('/api/telegram/confirm', json={}).status_code, 409)

    def test_webhook_scheduler_secrets_and_private_chat(self):
        self.assertEqual(self.client.post('/api/telegram/webhook', json={}).status_code, 403)
        self.assertEqual(self.client.get('/api/telegram/worker').status_code, 403)
        self.post('question', private=False)
        self.assertEqual(self.db.query(TelegramUpdate).count(), 0)
        with patch.object(settings, 'telegram_enabled', False):
            self.assertFalse(self.client.get('/api/telegram/status').json()['available'])
            self.assertEqual(self.client.post('/api/telegram/link').status_code, 503)

    def test_duplicates_and_quota_use_only_linked_user(self):
        self.connect(); self.post('Explain triangles', 2); self.post('Explain triangles', 2)
        seen = []
        def reply(db, user, question, update_id):
            seen.append(user.id)
            return 'Three sides.'
        with patch('app.services.telegram_worker.telegram_reply', side_effect=reply) as ai:
            self.process(); self.assertEqual(ai.call_count, 1); self.assertEqual(seen, [1])
        self.db.expire_all(); conn = self.db.get(TelegramConnection, 1)
        conn.question_count = settings.telegram_daily_question_limit; conn.quota_day = utcnow().date().isoformat(); self.db.commit()
        self.post('Another question', 3)
        with patch('app.services.telegram_worker.telegram_reply') as ai:
            self.process(); ai.assert_not_called()

    def test_daily_once_per_day_and_five_interactive_questions(self):
        self.connect(); conn = self.db.get(TelegramConnection, 1)
        conn.next_due_at = utcnow() - timedelta(minutes=1); self.db.commit()
        self.assertEqual(enqueue_daily(self.db), 1); self.assertEqual(enqueue_daily(self.db), 0)
        self.sent.reset_mock()
        with patch('app.services.telegram_worker.generate_daily', return_value=self.lesson()) as ai:
            while work_daily(self.db): pass
        self.assertEqual(ai.call_count, 1); self.assertEqual(self.sent.call_count, 6)
        self.assertEqual(self.db.query(TelegramDaily).one().status, 'done')
        messages = [call.args[1] for call in self.sent.call_args_list]
        self.assertIn('new fact', messages[0]['text'])
        self.assertTrue(all('inline_keyboard' in msg['reply_markup'] for msg in messages[1:]))

    def test_answers_owned_and_scored_once(self):
        self.connect()
        daily = TelegramDaily(user_id=1, chat_id=101, local_day='2026-10-07', content=self.lesson().model_dump(), status='done', sent_count=6)
        self.db.add(daily); self.db.commit()
        def answer(index, chat=101, update=10):
            self.client.post('/api/telegram/webhook', headers={'X-Telegram-Bot-Api-Secret-Token': 'webhook-secret'}, json={
                'update_id': update, 'callback_query': {'id': str(update), 'from': {'id': chat},
                'message': {'chat': {'id': chat, 'type': 'private'}}, 'data': f'd:{daily.id}:{index}:0'}})
        self.db.add(TelegramConnection(user_id=2, chat_id=202)); self.db.commit()
        answer(0, chat=202); self.process(); self.db.expire_all()
        self.assertEqual(self.db.get(TelegramDaily, daily.id).answers, {})
        for i in range(5): answer(i, update=20+i); self.process()
        answer(4, update=30); self.process(); self.db.expire_all()
        self.assertEqual(self.db.query(QuizAttempt).count(), 1)
        self.assertEqual(self.db.query(QuizAttempt).one().score_percent, 100)

    def test_disconnect_cancels_queued_private_reply_and_daily(self):
        self.connect(); self.post('Explain triangles', 2)
        with patch('app.services.telegram_worker.telegram_reply', return_value='Private reply'):
            with self.sessions() as db: work_update(db)
        self.db.add(TelegramDaily(user_id=1, chat_id=101, local_day='2026-10-07')); self.db.commit()
        self.client.delete('/api/telegram/connection'); self.sent.reset_mock(); self.process()
        self.sent.assert_not_called(); self.db.expire_all()
        self.assertEqual(self.db.query(TelegramDaily).one().status, 'cancelled')

    def test_stop_resume_and_timezone_validation(self):
        self.connect(); self.post('/stop', 2); self.process()
        self.assertFalse(self.client.get('/api/telegram/status').json()['daily_enabled'])
        self.post('/resume', 3); self.process()
        self.assertTrue(self.client.get('/api/telegram/status').json()['daily_enabled'])
        self.assertEqual(self.client.patch('/api/telegram/preferences', json={'timezone': 'Not/AZone'}).status_code, 422)
        self.assertEqual(self.client.patch('/api/telegram/preferences', json={'daily_time': '25:00'}).status_code, 422)
        self.assertEqual(next_due('Australia/Sydney', '18:00', datetime(2026, 10, 7, tzinfo=timezone.utc)).hour, 7)
        self.assertEqual(next_due('Australia/Sydney', '18:00', datetime(2026, 7, 7, tzinfo=timezone.utc)).hour, 8)

    def test_delivery_retry_does_not_regenerate_ai(self):
        self.connect(); self.post('Explain triangles', 2)
        with patch('app.services.telegram_worker.telegram_reply', return_value='Three sides.') as ai:
            self.sent.side_effect = TelegramError(429, 1); self.process()
            self.assertEqual(ai.call_count, 1); self.db.expire_all()
            job = self.db.get(TelegramUpdate, 2); self.assertEqual(job.status, 'sending')
            job.available_at = utcnow() - timedelta(seconds=1); self.db.commit()
            self.sent.side_effect = None; self.process(); self.assertEqual(ai.call_count, 1)
        self.db.expire_all(); self.assertEqual(self.db.get(TelegramUpdate, 2).status, 'done')

    def test_blocked_bot_disconnects(self):
        self.connect(); self.post('/help', 2); self.sent.side_effect = TelegramError(403); self.process()
        self.assertFalse(self.client.get('/api/telegram/status').json()['connected'])

    def test_real_tutor_service_uses_own_memory_and_saves_shared_history(self):
        self.db.add_all([
            LearningMemory(user_id=1, source_type='explanation', source_id='own', title='Triangles', content='Student one triangles'),
            LearningMemory(user_id=2, source_type='explanation', source_id='other', title='Triangles', content='PRIVATE OTHER STUDENT'),
        ])
        self.db.commit()
        with patch('app.services.telegram_learning.get_anthropic_client') as client:
            model = client.return_value.with_options.return_value.messages
            model.create.return_value = SimpleNamespace(content=[SimpleNamespace(type='text', text='Triangles have three sides.')])
            reply = telegram_reply(self.db, self.db.get(User, 1), 'Explain triangles', 99)
            self.db.commit()
            self.assertIn('three sides', reply)
            self.assertNotIn('PRIVATE OTHER STUDENT', model.create.call_args.kwargs['system'])
            self.assertEqual(self.db.query(TutorTurn).filter_by(user_id=1).count(), 1)
            telegram_reply(self.db, self.db.get(User, 1), 'Explain triangles', 99)
            self.assertEqual(model.create.call_count, 1)

    def test_daily_generator_requires_exactly_five_valid_questions(self):
        with patch('app.services.telegram_learning.get_anthropic_client') as client:
            model = client.return_value.with_options.return_value.messages
            model.create.return_value = SimpleNamespace(content=[SimpleNamespace(type='text', text=self.lesson().model_dump_json())])
            self.assertEqual(len(generate_daily(self.db, 1).questions), 5)
            model.create.return_value = SimpleNamespace(content=[SimpleNamespace(type='text', text='{"questions": []}')])
            with self.assertRaises(ValueError):
                generate_daily(self.db, 1)

    def test_queued_command_cannot_control_a_different_linked_account(self):
        self.connect()
        self.post('/stop', 2)
        self.client.delete('/api/telegram/connection')
        self.db.expire_all()
        self.db.add(TelegramConnection(user_id=2, chat_id=101, daily_enabled=True)); self.db.commit()
        self.process(); self.db.expire_all()
        self.assertTrue(self.db.get(TelegramConnection, 2).daily_enabled)

    def test_inline_webhook_processes_only_its_own_update_and_deduplicates(self):
        self.connect()
        self.post('Queued older question', 2)
        with patch.object(settings, 'telegram_process_inline', True):
            with patch('app.services.telegram_worker.telegram_reply', return_value='Quick reply') as ai:
                self.sent.reset_mock()
                self.assertEqual(self.post('New question', 3).status_code, 200)
                self.assertEqual(ai.call_count, 1)
                self.assertEqual(ai.call_args.args[2], 'New question')
                self.assertEqual(self.sent.call_count, 1)
                self.post('New question', 3)
                self.assertEqual(ai.call_count, 1)
                self.assertEqual(self.sent.call_count, 1)
        self.db.expire_all()
        self.assertEqual(self.db.get(TelegramUpdate, 2).status, 'pending')
        self.assertEqual(self.db.get(TelegramUpdate, 3).status, 'done')
