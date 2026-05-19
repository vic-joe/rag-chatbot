from pydantic import BaseModel, Field


class AuthRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=80)
    password: str = Field(..., min_length=1, max_length=200)


class RegisterRequest(AuthRequest):
    password: str = Field(..., min_length=6, max_length=200)


class UserResponse(BaseModel):
    id: int
    username: str
    role: str = "user"

    class Config:
        from_attributes = True
