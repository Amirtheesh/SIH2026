from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenWithRole(BaseModel):
    """Login response - includes role + email so frontend knows who is logged in."""
    access_token: str
    token_type: str
    role: str
    email: str
    name: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
