"""Offline integration tests: real SQLite storage and routes, mocked AI only."""
from datetime import datetime, timezone
import unittest
from unittest.mock import patch
import uuid

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.session import Base, get_db
from app.models import profile  # registers FK tables
from app.models.memory import LearningMemory, SavedQuiz, TutorTurn
from app.models.quiz import QuizAttempt
from app.models.user import User
from app.routers import quiz, topics, tutor
from app.routers.auth import get_current_user
from app.schemas.quiz import QuizQuestion
from app.schemas.topic import TopicExplainResponse
from app.services.learning_memory import date_window, retrieve_learning_memory


class LearningMemoryTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        self.db = self.sessions()
        self.db.add_all([User(id=i, name=f"Student {i}", email=f"s{i}@example.com", hashed_password="test") for i in (1, 2)])
        self.db.commit()
        self.user_id = 1
        app = FastAPI()
        for router in (quiz, topics, tutor):
            app.include_router(router.router)
        def session():
            with self.sessions() as db:
                yield db
        app.dependency_overrides[get_db] = session
        app.dependency_overrides[get_current_user] = lambda: self.db.get(User, self.user_id)
        self.client = TestClient(app)
        self.captcha = patch.object(settings, "turnstile_enabled", False)
        self.captcha.start()
        self.addCleanup(self.captcha.stop)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.db.close)
        self.addCleanup(self.client.close)

    def question(self):
        return QuizQuestion(id="q1", subject="Mathematics", topic="Algebra", difficulty="Easy",
                            prompt="Solve x + 2 = 5", options=[{"id": "a", "text": "3"}, {"id": "b", "text": "7"}],
                            correct_option_id="a", explanation="Subtract two from five.")

    def generate(self):
        with patch("app.routers.quiz.generate_quiz", return_value=[self.question()]):
            response = self.client.post("/api/quiz/generate", json={"subject": "Mathematics", "topic": "Algebra", "difficulty": "Easy", "question_count": 1})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["quiz_id"]

    def submit(self, quiz_id, selected="b"):
        return self.client.post("/api/quiz/submit", json={"quiz_id": quiz_id, "answers": [{"question_id": "q1", "selected_option_id": selected}], "correct_count": 100})

    def test_server_scores_and_saves_actual_mistakes_once(self):
        quiz_id = self.generate()
        response = self.submit(quiz_id)
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["score_percent"], 0)
        self.assertEqual(self.submit(quiz_id).json()["id"], response.json()["id"])
        self.assertEqual(self.submit(quiz_id, "a").status_code, 409)
        self.assertEqual(self.db.query(QuizAttempt).count(), 1)
        record = self.db.query(LearningMemory).one()
        self.assertIn("Incorrect: Solve x + 2 = 5", record.content)
        self.assertIn("Student answer: 7", record.content)
        self.assertEqual(self.db.query(SavedQuiz).one().answers[0]["selected_option_id"], "b")

    def test_correct_and_unanswered_results(self):
        self.assertEqual(self.submit(self.generate(), "a").json()["score_percent"], 100)
        self.assertEqual(self.submit(self.generate(), None).json()["score_percent"], 0)

    def test_quiz_ownership_and_invalid_answers(self):
        quiz_id = self.generate()
        self.user_id = 2
        self.assertEqual(self.submit(quiz_id).status_code, 404)
        self.user_id = 1
        self.assertEqual(self.submit(quiz_id, "forged").status_code, 422)
        for answers in ([], [{"question_id": "other"}], [{"question_id": "q1"}, {"question_id": "q1"}]):
            response = self.client.post("/api/quiz/submit", json={"quiz_id": quiz_id, "answers": answers})
            self.assertEqual(response.status_code, 422)
        self.assertEqual(self.db.query(QuizAttempt).count(), 0)

    def test_full_explanation_is_saved(self):
        explanation = TopicExplainResponse(summary="Plants convert light", key_points=["Chlorophyll"], example="A leaf", practice_tip="Draw a diagram")
        with patch("app.routers.topics.explain_topic", return_value=explanation):
            response = self.client.post("/api/topics/explain", json={"subject": "Science", "topic": "Photosynthesis", "year_level": "Year 10"})
        self.assertEqual(response.status_code, 200, response.text)
        record = self.db.query(LearningMemory).one()
        self.assertIn("Chlorophyll", record.content)
        self.assertIn("Draw a diagram", record.content)

    def memory(self, user_id, content, when, kind="explanation"):
        record = LearningMemory(user_id=user_id, source_type=kind, source_id=str(uuid.uuid4()), title=content[:100], content=content, created_at=when)
        self.db.add(record)
        return record

    def test_retrieves_older_relevant_memory_without_other_users(self):
        self.memory(1, "Photosynthesis involves chlorophyll", datetime(2026, 1, 1))
        for day in range(1, 25):
            self.memory(1, "Algebra practice", datetime(2026, 9, day))
        self.memory(2, "Photosynthesis secret of another student", datetime(2026, 10, 1))
        self.db.commit()
        context, sources = retrieve_learning_memory(self.db, 1, "What did I learn about photosynthesis?")
        self.assertIn("chlorophyll", context)
        self.assertNotIn("another student", context)
        self.assertEqual(sources[1]["title"], "Photosynthesis involves chlorophyll")

    def test_dated_statistics_include_old_scores_and_keep_difficulty_separate(self):
        for day, score, difficulty in [(1, 40, "Easy"), (20, 80, "Easy"), (21, 20, "Hard")]:
            self.db.add(QuizAttempt(user_id=1, subject="Mathematics", topic="Algebra", difficulty=difficulty,
                                   total_questions=5, correct_count=score // 20, score_percent=score,
                                   created_at=datetime(2026, 9, day)))
        self.memory(1, "September mistake", datetime(2026, 9, 10), "quiz")
        self.memory(1, "October only", datetime(2026, 10, 2))
        self.db.commit()
        context, _ = retrieve_learning_memory(self.db, 1, "How was algebra last month?", datetime(2026, 10, 5, tzinfo=timezone.utc))
        import json
        facts = json.loads(context)["facts"]
        easy = next(g for g in facts["topic_statistics_subset"] if g["difficulty"] == "Easy")
        self.assertEqual(easy["average_percent"], 60)
        self.assertEqual(easy["first"]["score_percent"], 40)
        self.assertEqual(easy["latest"]["score_percent"], 80)
        self.assertNotIn("October only", context)
        self.assertEqual(facts["period_quiz_attempts"], 3)

    def test_calendar_boundaries(self):
        now = datetime(2026, 1, 5, tzinfo=timezone.utc)
        start, end = date_window("last month", now)
        self.assertEqual(start.date().isoformat(), "2025-12-01")
        self.assertEqual(end.date().isoformat(), "2026-01-01")
        self.assertEqual(date_window("September 2025", now)[0].month, 9)
        self.assertIsNone(date_window("2026-99-99", now))

    def chat(self, message="What should I study?", request_id=None):
        return self.client.post("/api/tutor/chat", json={"message": message, "request_id": request_id or str(uuid.uuid4())})

    def test_chat_persists_restores_server_history_and_retries_idempotently(self):
        request_id = str(uuid.uuid4())
        with patch("app.routers.tutor.get_tutor_reply", return_value="Practise algebra") as ai:
            response = self.chat(request_id=request_id)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(self.chat(request_id=request_id).json(), response.json())
            self.assertEqual(ai.call_count, 1)
            self.assertEqual(self.chat("Different question", request_id).status_code, 409)
            self.chat("What did you suggest?")
            messages = ai.call_args.args[1]
            self.assertEqual([m.role for m in messages], ["user", "assistant", "user"])
            self.assertEqual(messages[1].content, "Practise algebra")
        response = self.client.get("/api/tutor/history")
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(len(response.json()["messages"]), 4)
        self.assertTrue(response.json()["messages"][-1]["sources"])
        self.user_id = 2
        self.assertEqual(self.client.get("/api/tutor/history").json(), {"messages": []})

    def test_failed_or_empty_reply_does_not_create_false_memories(self):
        for result in (RuntimeError("unavailable"), ""):
            with patch("app.routers.tutor.get_tutor_reply", side_effect=result if isinstance(result, Exception) else None, return_value=""):
                self.assertIn(self.chat().status_code, [502, 503])
        self.assertEqual(self.db.query(TutorTurn).count(), 0)
        self.assertEqual(self.db.query(LearningMemory).count(), 0)
        self.assertEqual(self.chat("   ").status_code, 422)

    def test_delete_removes_chat_memory_only_for_signed_in_user(self):
        with patch("app.routers.tutor.get_tutor_reply", return_value="Algebra"):
            self.chat()
            self.user_id = 2
            self.chat("Second student")
        self.user_id = 1
        self.memory(1, "Saved explanation", datetime(2026, 9, 1))
        self.db.commit()
        self.assertEqual(self.client.delete("/api/tutor/history").status_code, 204)
        self.assertEqual(self.client.get("/api/tutor/history").json()["messages"], [])
        self.assertEqual(self.db.query(LearningMemory).filter_by(user_id=1).one().source_type, "explanation")
        self.assertEqual(self.db.query(TutorTurn).one().user_id, 2)
        context, _ = retrieve_learning_memory(self.db, 1, "What did we discuss?")
        self.assertNotIn("Tutor suggested", context)


if __name__ == "__main__":
    unittest.main()
