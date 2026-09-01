from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.profile import UserProfile
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.profile import UserProfileCreate, UserProfileRead

router = APIRouter(prefix="/api/profile", tags=["profile"])


def _to_read(profile: UserProfile) -> UserProfileRead:
    return UserProfileRead(
        year_level=profile.year_level,
        subjects=profile.subjects.split(","),
        goal=profile.goal,
        confidence=profile.confidence,
    )


@router.get("/me", response_model=UserProfileRead | None)
def get_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    return _to_read(profile) if profile else None


@router.put("/me", response_model=UserProfileRead)
def upsert_profile(
    payload: UserProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    subjects_value = ",".join(payload.subjects)

    if profile is None:
        profile = UserProfile(
            user_id=current_user.id,
            year_level=payload.year_level,
            subjects=subjects_value,
            goal=payload.goal,
            confidence=payload.confidence,
        )
        db.add(profile)
    else:
        profile.year_level = payload.year_level
        profile.subjects = subjects_value
        profile.goal = payload.goal
        profile.confidence = payload.confidence

    db.commit()
    db.refresh(profile)
    return _to_read(profile)
