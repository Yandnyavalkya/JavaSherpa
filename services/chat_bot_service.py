from datetime import datetime
import uuid
from fastapi import BackgroundTasks
from utils.success import error, result,success
from models.schemas import KnowledgeBot, User, ChatTranscript
from dotenv import load_dotenv
from bson import ObjectId
from fastapi.responses import StreamingResponse, FileResponse
import json
import os
from config import constants
load_dotenv()

 

class ChatBot:
    
    def __init__(self,pineconeService):
        self.pineconeService = pineconeService

    async def create(self,data,request,backgroundTasks:BackgroundTasks):
        id = request.state.user['id']
        user = User.objects(id = ObjectId(id)).first()
        if not user:
             return error('User Not Found')
        namespace_id = str(uuid.uuid4())  
        data_dict = data.dict()  
        data_dict['namespace_id'] = namespace_id
        data_dict['user_id'] = id 

        botData = KnowledgeBot(**data_dict)      
        botData.save()
        
        return result({"namespace_id": namespace_id}, "Congratulations, your created your bot")
    
    async def getBotByUserId(self,request):  
         id = request.query_params.get('id') if request.query_params.get('id') else request.state.user['id']
         items = KnowledgeBot.objects(user_id =ObjectId(id))

         return result([item.to_mongo().to_dict() for item in items])
        
    
    async def getBotById(self,id): 
         cursor = KnowledgeBot.objects(id = ObjectId(id))  
         return result(cursor.first().to_mongo().to_dict())
      
    
    async def chat_conversation(self,data):  
            question = data.question
            namespace_id = data.namespace_id 
            chatHistory = ""
            for chat in data.chatHistory:
                chatHistory += f"User: {chat.question}\nAI: {chat.Ai_response}\n"
            
            return StreamingResponse(self.pineconeService.chain_resp(namespace_id,question,chatHistory), media_type="text/event-stream")
    
    async def reset_session(self, namespace_id: str):
            await self.pineconeService.reset_session(namespace_id)
            return success("Interview reset successfully")

    async def save_history(self, request, namespace_id: str, messages: list):
            user_id = request.state.user['id']
            # upsert: create a new transcript entry
            payload = {
                'user_id': ObjectId(user_id),
                'namespace_id': namespace_id,
                'messages_json': json.dumps(messages)
            }
            doc = ChatTranscript(**payload)
            doc.save()
            return result({'_id': str(doc.id)}, 'Chat history saved')

    async def get_history(self, request, namespace_id: str):
            user_id = request.state.user['id']
            items = ChatTranscript.objects(user_id=ObjectId(user_id), namespace_id=namespace_id).order_by('-created_at')
            return result([item.to_mongo().to_dict() for item in items])

    async def save_history_pdf(self, request, namespace_id: str, messages: list):
            # Generate a simple PDF transcript using reportlab
            try:
                from reportlab.lib.pagesizes import letter
                from reportlab.pdfgen import canvas
                from reportlab.lib.utils import simpleSplit
            except Exception:
                return error('PDF generation dependency missing. Please install reportlab.')

            os.makedirs(os.path.join(constants.UPLOAD_DIR, namespace_id, 'transcripts'), exist_ok=True)
            file_name = f"transcript_{uuid.uuid4().hex}.pdf"
            pdf_path = os.path.join(constants.UPLOAD_DIR, namespace_id, 'transcripts', file_name)

            c = canvas.Canvas(pdf_path, pagesize=letter)
            width, height = letter
            margin = 50
            y = height - margin
            c.setTitle('JavaShepa Interview Transcript')
            c.setFont('Helvetica-Bold', 14)
            c.drawString(margin, y, 'JavaShepa Interview Transcript')
            y -= 24
            c.setFont('Helvetica', 10)
            for m in messages:
                if y < margin + 60:
                    c.showPage()
                    y = height - margin
                    c.setFont('Helvetica', 10)
                if m.get('question'):
                    text = f"User: {m.get('question')}"
                    wrapped = simpleSplit(text, 'Helvetica', 10, width - 2*margin)
                    for line in wrapped:
                        c.drawString(margin, y, line)
                        y -= 14
                if m.get('Ai_response'):
                    text = f"AI: {m.get('Ai_response')}"
                    wrapped = simpleSplit(text, 'Helvetica', 10, width - 2*margin)
                    for line in wrapped:
                        c.drawString(margin, y, line)
                        y -= 14
                y -= 8
            c.save()

            # store record
            user_id = request.state.user['id']
            doc = ChatTranscript(
                user_id=ObjectId(user_id),
                namespace_id=namespace_id,
                messages_json=json.dumps(messages),
                pdf_path=pdf_path
            )
            doc.save()
            return result({'_id': str(doc.id), 'pdf_path': pdf_path}, 'Transcript PDF saved')





    


