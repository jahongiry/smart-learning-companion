"""Run with DATABASE_URL=sqlite:// SECRET_KEY=test .venv/bin/python -m unittest discover -s tests."""
import io
import json
import unittest
from unittest.mock import patch
from urllib.error import URLError

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.captcha import captcha_configuration, verify_captcha
from app.core.config import settings
from app.routers import auth, learning_path, quiz, security, topics, tutor


class CaptchaTests(unittest.TestCase):
    def setUp(self):
        for name, value in {
            "turnstile_enabled": True,
            "turnstile_site_key": "public-key",
            "turnstile_secret_key": "test-secret",
            "turnstile_hostnames": "app.example.com",
        }.items():
            patcher = patch.object(settings, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.urlopen = patch("app.core.captcha.urlopen").start()
        self.addCleanup(patch.stopall)

    def response(self, **overrides):
        body = {"success": True, "action": "login", "hostname": "app.example.com", **overrides}
        self.urlopen.return_value = io.BytesIO(json.dumps(body).encode())

    def test_configuration_only_exposes_public_key(self):
        self.assertEqual(captcha_configuration(), {"enabled": True, "site_key": "public-key"})

    def test_missing_configuration_fails_closed(self):
        for name in ("turnstile_secret_key", "turnstile_site_key", "turnstile_hostnames"):
            with self.subTest(name=name), patch.object(settings, name, ""), self.assertRaises(HTTPException) as error:
                verify_captcha("token", "login")
            self.assertEqual(error.exception.status_code, 503)
        self.urlopen.assert_not_called()

    def test_explicitly_disabled_for_local_development(self):
        with patch.object(settings, "turnstile_enabled", False):
            verify_captcha(None, "login")
            self.assertEqual(captcha_configuration(), {"enabled": False, "site_key": None})
        self.urlopen.assert_not_called()

    def test_missing_and_oversized_tokens_are_rejected_before_network(self):
        for token in (None, "", " ", "x" * 2049):
            with self.subTest(token_length=len(token or "")), self.assertRaises(HTTPException) as error:
                verify_captcha(token, "login")
            self.assertEqual(error.exception.status_code, 403)
        self.urlopen.assert_not_called()

    def test_valid_token_checks_with_cloudflare(self):
        self.response()
        verify_captcha("token", "login")
        request = self.urlopen.call_args.args[0]
        self.assertEqual(request.full_url, "https://challenges.cloudflare.com/turnstile/v0/siteverify")
        self.assertEqual(json.loads(request.data), {"secret": "test-secret", "response": "token"})
        self.assertEqual(self.urlopen.call_args.kwargs["timeout"], 10)

    def test_rejects_failure_replay_wrong_action_and_other_websites(self):
        for overrides in (
            {"success": False, "error-codes": ["timeout-or-duplicate"]},
            {"success": "true"}, {"action": "register"}, {"hostname": "attacker.example.com"},
            {"hostname": "app.example.com.attacker.com"}, {"hostname": []},
        ):
            with self.subTest(overrides=overrides):
                self.response(**overrides)
                with self.assertRaises(HTTPException) as error:
                    verify_captcha("token", "login")
                self.assertEqual(error.exception.status_code, 403)

    def test_cloudflare_failures_do_not_bypass_verification(self):
        for error in (URLError("offline"), TimeoutError("timeout"), ValueError("bad JSON")):
            self.urlopen.side_effect = error
            with self.subTest(error=error), self.assertRaises(HTTPException) as result:
                verify_captcha("token", "login")
            self.assertEqual(result.exception.status_code, 503)

    def test_malformed_cloudflare_response_fails_closed(self):
        self.urlopen.return_value = io.BytesIO(b'[]')
        with self.assertRaises(HTTPException) as result:
            verify_captcha("token", "login")
        self.assertEqual(result.exception.status_code, 503)

    def test_all_protected_endpoints_reject_direct_requests_before_handlers(self):
        app = FastAPI()
        for router in (auth, quiz, topics, learning_path, tutor, security):
            app.include_router(router.router)
        with TestClient(app) as client:
            for method, path in (
                ("POST", "/api/auth/login"), ("POST", "/api/auth/register"),
                ("POST", "/api/quiz/generate"), ("POST", "/api/topics/explain"),
                ("GET", "/api/learning-path/generate"), ("POST", "/api/tutor/chat"),
            ):
                with self.subTest(path=path):
                    response = client.request(method, path)
                    self.assertEqual(response.status_code, 403)
                    self.assertIn("security check", response.json()["detail"])
            response = client.get("/api/security/captcha")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["cache-control"], "no-store")
            self.assertNotIn("test-secret", response.text)
        self.urlopen.assert_not_called()


if __name__ == "__main__":
    unittest.main()
