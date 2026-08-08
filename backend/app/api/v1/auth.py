from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.schemas.token import TokenWithRole

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    # Check if user exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )

    # Role is always 'public' on self-registration.
    # Admin/operator accounts must be seeded by an administrator.
    # This prevents privilege escalation via registration.
    user = User(
        email=user_in.email,
        name=user_in.name,
        password_hash=security.get_password_hash(user_in.password),
        role="public"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=TokenWithRole)
async def login(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    # Role is sourced from the DB record — the client never controls this.
    access_token = security.create_access_token(
        user.id, role=user.role, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,       # DB-authoritative role returned to frontend
        "email": user.email,
        "name": user.name,
    }
