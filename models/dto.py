from enum import Enum
from pydantic import BaseModel ,Field
from typing import List

class DeleteFilesDTO(BaseModel):
    namespace_id: str 
    ids: List[str] = None
    names:List[str] = None

class DeleteFileDTO(BaseModel):
    namespace_id: str 
    id:  str= None
    name: str = None    

class CreateBot(BaseModel): 
    bot_name:str   
    description:str 

class conversation(BaseModel): 
    question: str = ""  # Allow empty string
    Ai_response: str = ""  # Allow empty string
    
    class Config:
        extra = "ignore"  # Ignore any additional fields  
    
class ChatRequest(BaseModel): 
    question: str
    namespace_id: str    
    chatHistory:List[conversation] 

class ChatHistorySave(BaseModel):
    namespace_id: str
    messages: List[conversation]

class ResetInterviewDTO(BaseModel):
    namespace_id: str

class SettingsUpdate(BaseModel):
    theme: str
    voice: str

class UserLogin(BaseModel):  
    email:str  
    password:str 


class Roles(str,Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    KNOWLEDGE_OWNER = "KNOWLEDGE_OWNER" 
    
class UserRegister(BaseModel):  
    email:str  
    password:str  
    name:str  
    phone_number:int     
    company_name:str   
       
class UpdateUser(BaseModel):  
    _id:str
    email:str  
    name:str  
    phone_number:int     
    company_name:str 


class ResetPassword(BaseModel):  
    token:str  
    newPassword:str  
    confirmPassword:str    


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordWithOTP(BaseModel):
    email: str
    otp: str
    newPassword: str
    confirmPassword: str

class Status(str,Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
   
class Product(str,Enum):
    KNOWLEDGE_MANAGER = "KNOWLEDGE_MANAGER" 
    
    


       

  
 
     
