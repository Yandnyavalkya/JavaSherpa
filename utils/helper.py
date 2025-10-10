import os
from config import constants
from models.schemas import User
from dotenv import load_dotenv
load_dotenv()
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.openapi.utils import get_openapi
from fastapi import Depends

def save_uploaded_file(uploaded_file, namespace_id):
    upload_dir: str = os.path.join(constants.UPLOAD_DIR, namespace_id, constants.PRIMARY_FOLDER)

   # Create directories if they don't exist
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, uploaded_file.filename)
    with open(file_path, "wb") as f:
        f.write(uploaded_file.file.read())
    return file_path


def create_super_admin():
    # Check if super admin already exists
    user = User.objects(role="SUPER_ADMIN").first()
    if user: 
        return
    else:
        superUser = User(**constants.SUPER_ADMIN_DATA)
        superUser.save()
        print("Super admin created successfully.")
        return
    
bearer_scheme = HTTPBearer()

def get_current_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    return credentials.credentials    
