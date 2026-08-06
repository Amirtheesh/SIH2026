from pydantic import BaseModel
from uuid import UUID

class UserBase(BaseModel):
    email: str
    name: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: UUID
    role: str

    class Config:
        from_attributes = True
