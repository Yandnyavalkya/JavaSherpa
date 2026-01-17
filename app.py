from fastapi import FastAPI,Depends
from fastapi.middleware.cors import CORSMiddleware
from routers import chat_bot, chat_bot_files,user 
from config.mongodb  import init_db
from utils.exception import CustomExceptionHandler
from utils.helper import create_super_admin
from utils.jwt import JwtMiddleware

app = FastAPI(swagger_ui_parameters={"displayRequestDuration": True},
              openapi_url="/openapi.json"
           
              )
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

exempt_routes=["/user/login", "/user/register","/user/verify-email","/user/reset-password" ,"/docs","/openapi.json"]

app.add_middleware(CustomExceptionHandler)
app.add_middleware(JwtMiddleware,exempt_routes=exempt_routes)
 

@app.on_event("startup")
async def startup_event():
    """Initialize database and create super admin on application startup"""
    try:
        init_db()
        create_super_admin()
    except Exception as e:
        print(f"Warning: Failed to initialize database on startup: {str(e)}")
        print("The application will continue, but database operations may fail.")

@app.get("/health")
async def healthCheck():
   return "Ok"

app.include_router(chat_bot.router,
    prefix="/chat-bot",
    tags=["ChatBot"])

app.include_router(user.router,
    prefix="/user",
    tags=["User"])

app.include_router(chat_bot_files.router,
    prefix="/files",
    tags=["Files"])

 



