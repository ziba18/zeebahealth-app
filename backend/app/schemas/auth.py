from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)
    display_name: str | None = Field(default=None, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str = Field(max_length=4096)


class SocialAuthRequest(BaseModel):
    id_token: str = Field(max_length=8192)
    display_name: str | None = Field(default=None, max_length=100)
    # Google only: checked against the ID token's `at_hash` claim.
    access_token: str | None = Field(default=None, max_length=4096)


class UserResponse(BaseModel):
    id: str
    email: str
    email_verified: bool = False
    # True while the app must show the "enter the code we emailed you" step before anything else.
    verification_required: bool = False
    # Wording version she agreed to for storing health information; None = not asked yet.
    health_consent_version: str | None = None


class ConsentRequest(BaseModel):
    version: str = Field(min_length=1, max_length=20)


class CodeRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6, pattern=r"^[0-9]{6}$")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^[0-9]{6}$")
    new_password: str = Field(max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(max_length=128)
