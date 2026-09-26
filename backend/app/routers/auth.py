from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import (create_access_token, create_reset_token,
                               decode_token, hash_password, verify_password)
from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, UserRole
from app.schemas.user import (PasswordReset, PasswordResetRequest, Token,
                              UserCreate, UserLogin, UserOut)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _token_response(user: User) -> Token:
    return Token(
        access_token=create_access_token(user.id, user.role.value),
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    exists = db.scalar(select(User).where(User.email == payload.email.lower()))
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "That email already has an account")
    user = User(
        full_name=payload.full_name.strip(),
        email=payload.email.lower(),
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=UserRole.customer,
        preferred_language=payload.preferred_language,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_response(user)


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    # same message either way so the endpoint can't be used to enumerate emails
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect")
    return _token_response(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/forgot-password")
def forgot_password(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    response = {"message": "If that email is registered, a reset link is on its way."}
    if user is None:
        return response
    token = create_reset_token(user.id)
    # Production: email this link. Development: return it so the flow is testable.
    if settings.payment_provider == "mock":
        response["reset_token"] = token
    return response


@router.post("/reset-password")
def reset_password(payload: PasswordReset, db: Session = Depends(get_db)):
    data = decode_token(payload.token, expected_type="reset")
    if data is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This reset link has expired")
    user = db.get(User, int(data["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated. Sign in with your new password."}
