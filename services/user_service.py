from datetime import timedelta
import os
from models.dto import UpdateUser
from models.schemas import User  
from utils.success import result,success,error
from bson import ObjectId
import bcrypt
from models.schemas import UserSettings
from datetime import datetime


class UserQueries:

    def __init__(self):
         pass

    async def register_user(self,user):  
        existing = User.objects(email=user.email).first()
        if existing:
             return error('User already exist')
        userData = User(**user.dict())      
        userData.save()
        return success("User registered successfully!")

    async def get_all_users(self):
       items = User.objects()
       return result([item.to_mongo().to_dict() for item in items])
    
    async def delete_user(self, id:int):
          item = User.objects(id=id).first()
          if not item:
               return error('User Not Found')
          item.delete()
          return success("User deleted successfully")
    
    async def login(self, data):
        existing = User.objects(email=data.email).first()
 
        if not existing:
             return error('User Not Found')
        
        if not existing.check_password(data.password):
             return error('Password is incorrect')
        else:
             payload={"id":str(existing.to_mongo().to_dict()['_id'])}
              
             token = existing.generate_token(payload) 
             return result({"token":token},'Login successfully')
    
    async def get_user_by_id(self, id:int):
        user = User.objects(id = ObjectId(id)).first()
        if not user:
             return error('User Not Found')
        return result(user.to_mongo().to_dict())

    async def getUserByRole(self,role:str):
         items = User.objects(role=role)
         return result([item.to_mongo().to_dict() for item in items])
    
    async def updateUser(self,data:UpdateUser):
          item = User.objects(id=ObjectId(data._id)).first()
          if not item:
               raise error("User not found")
          
          item.update(**data.dict())
          item.reload()
          return result(item.to_mongo().to_dict())

    async def get_settings(self, user_id: str):
          doc = UserSettings.objects(user_id=ObjectId(user_id)).first()
          if not doc:
               return result({"theme":"light","voice":"female"})
          return result(doc.to_mongo().to_dict())

    async def update_settings(self, user_id: str, theme: str, voice: str):
          doc = UserSettings.objects(user_id=ObjectId(user_id)).first()
          if not doc:
               doc = UserSettings(user_id=ObjectId(user_id), theme=theme, voice=voice)
               doc.save()
          else:
               doc.update(theme=theme, voice=voice, updated_at=datetime.utcnow())
               doc.reload()
          return result(doc.to_mongo().to_dict(), 'Settings updated')

  
        
        
        