from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Form, Depends, Request
from models.dto import (
    ResetPassword,
    UpdateUser,
    UserLogin,
    UserRegister,
    ForgotPasswordRequest,
    ResetPasswordWithOTP,
)
from services.user_service import UserQueries
from utils.helper import get_current_token
router = APIRouter() 

userQueries = UserQueries()

@router.post("/register")
async def create(data:UserRegister):
    return await userQueries.register_user(data)

@router.post("/login")
async def login(data:UserLogin):
    return await userQueries.login(data)


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """
    Start password reset flow by sending an OTP to the registered email.
    """
    return await userQueries.request_password_reset(data)


@router.post("/reset-password")
async def reset_password(data: ResetPasswordWithOTP):
    """
    Reset password using email + OTP + new password.
    """
    return await userQueries.reset_password_with_otp(data)

 
@router.get("")
async def getAll():
    return await userQueries.get_all_users()

 
@router.get("/{id}")
async def getById(id:str):
    return await userQueries.get_user_by_id(id)

@router.get("/settings", dependencies=[Depends(get_current_token)])
async def getSettings(request: Request):
    user_id = request.state.user['id']
    return await userQueries.get_settings(user_id)

@router.post("/settings", dependencies=[Depends(get_current_token)])
async def updateSettings(request: Request, theme: str, voice: str):
    user_id = request.state.user['id']
    return await userQueries.update_settings(user_id, theme, voice)
 
 