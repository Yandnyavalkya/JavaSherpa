from fastapi import APIRouter,UploadFile,File,BackgroundTasks,Form
from models.dto import ResetPassword, UpdateUser, UserLogin,UserRegister
from services.user_service import UserQueries
from utils.helper import get_current_token
from fastapi import Depends, Request
router = APIRouter() 

userQueries = UserQueries()

@router.post("/register")
async def create(data:UserRegister):
    return await userQueries.register_user(data)

@router.post("/login")
async def login(data:UserLogin):
    return await userQueries.login(data)

 
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
 
 