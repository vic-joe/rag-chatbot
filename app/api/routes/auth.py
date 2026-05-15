from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.db.models import User
from app.db.session import get_db
from app.schemas.auth import AuthRequest, UserResponse

router = APIRouter()


def normalize_username(username: str) -> str:
    return username.strip().lower()


@router.post("/register", response_model=UserResponse, status_code=201)
def register(payload: AuthRequest, db: Session = Depends(get_db)):
    username = normalize_username(payload.username)
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    user = User(username=username, password_hash=hash_password(payload.password))

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Username already exists")

    return user


@router.post("/login", response_model=UserResponse)
def login(payload: AuthRequest, db: Session = Depends(get_db)):
    username = normalize_username(payload.username)
    user = db.query(User).filter(User.username == username).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return user
