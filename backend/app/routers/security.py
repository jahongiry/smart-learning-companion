from fastapi import APIRouter, Response

from app.core.captcha import captcha_configuration

router = APIRouter(prefix="/api/security", tags=["security"])


@router.get("/captcha")
def get_captcha_configuration(response: Response):
    response.headers["Cache-Control"] = "no-store"
    return captcha_configuration()
