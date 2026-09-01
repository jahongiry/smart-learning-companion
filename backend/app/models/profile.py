from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    year_level: Mapped[str] = mapped_column(String(20))
    subjects: Mapped[str] = mapped_column(String(100))
    goal: Mapped[str] = mapped_column(String(50))
    confidence: Mapped[str] = mapped_column(String(20))
