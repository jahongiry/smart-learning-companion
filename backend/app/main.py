from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import Base, engine
from app.models import quiz, topic, user  # noqa: F401 -- registers the models with Base.metadata
from app.routers import auth, learning_path, progress, quiz as quiz_router, topics

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Learning Companion API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(quiz_router.router)
app.include_router(topics.router)
app.include_router(progress.router)
app.include_router(learning_path.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
