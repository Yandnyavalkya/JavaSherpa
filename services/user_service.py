from datetime import datetime, timedelta
import os
import random
from bson import ObjectId

from models.dto import UpdateUser, ForgotPasswordRequest, ResetPasswordWithOTP
from models.schemas import User, UserSettings, PasswordResetOTP
from utils.success import result, success, error, invalid_input
from utils.email_service import send_password_reset_otp_email


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

    async def request_password_reset(self, data: ForgotPasswordRequest):
          """
          Generate an OTP and send it to the user's registered email for password reset.
          """
          user = User.objects(email=data.email).first()
          if not user:
               return error('User not found')

          # Generate a 6-digit OTP
          otp = f"{random.randint(100000, 999999)}"
          validity_minutes = 15
          expires_at = datetime.utcnow() + timedelta(minutes=validity_minutes)

          # Invalidate previous OTPs for this user
          PasswordResetOTP.objects(user_id=user).update(set__used=True)

          # Create new OTP document
          otp_doc = PasswordResetOTP(user_id=user, otp=otp, expires_at=expires_at)
          otp_doc.save()

          # Send email
          email_sent = send_password_reset_otp_email(
               user_email=user.email,
               user_name=user.name,
               otp=otp,
               valid_minutes=validity_minutes,
          )

          if not email_sent:
               return error('Failed to send OTP email. Please try again later.')

          return success('OTP has been sent to your registered email.')

    async def reset_password_with_otp(self, data: ResetPasswordWithOTP):
          """
          Reset the user's password after validating the OTP.
          """
          if data.newPassword != data.confirmPassword:
               return invalid_input('New password and confirm password do not match')

          user = User.objects(email=data.email).first()
          if not user:
               return error('User not found')

          # Find a valid OTP
          now = datetime.utcnow()
          otp_doc = PasswordResetOTP.objects(
               user_id=user,
               otp=data.otp,
               used=False,
               expires_at__gt=now
          ).first()

          if not otp_doc:
               return error('Invalid or expired OTP')

          # Update password; pre_save will hash it
          user.password = data.newPassword
          user.save()

          # Mark OTP as used
          otp_doc.update(used=True)

          return success('Password has been reset successfully')