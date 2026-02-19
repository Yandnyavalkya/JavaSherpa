from fastapi import APIRouter,UploadFile,File,BackgroundTasks,Form,Request,Depends
from models.dto import DeleteFileDTO,ChatRequest,CreateBot,DeleteFilesDTO,ChatHistorySave,ResetInterviewDTO
from services.chat_bot_service import ChatBot
from typing import List
from services.pinecone_service import PineconeService
from utils.helper import get_current_token 
router = APIRouter() 

pineconeService = PineconeService()
chatBotService = ChatBot(pineconeService)

 

@router.post("",dependencies=[Depends(get_current_token)])
async def create(data:CreateBot,request: Request,backgroundTasks: BackgroundTasks = None):
    return await chatBotService.create(data,request,backgroundTasks)

@router.get("/all",dependencies=[Depends(get_current_token)])
async def getBotByUserId(request: Request):
    return await chatBotService.getBotByUserId(request)


@router.post("/chat",dependencies=[Depends(get_current_token)])
async def chatConversation(data: ChatRequest):
    return await chatBotService.chat_conversation(data)

@router.post("/reset",dependencies=[Depends(get_current_token)])
async def resetInterview(data: ResetInterviewDTO):
    return await chatBotService.reset_session(data.namespace_id)

@router.post("/history",dependencies=[Depends(get_current_token)])
async def saveHistory(request: Request, data: ChatHistorySave):
    return await chatBotService.save_history(request, data.namespace_id, data.messages)

@router.get("/history",dependencies=[Depends(get_current_token)])
async def getHistory(request: Request, namespace_id: str):
    return await chatBotService.get_history(request, namespace_id)

@router.post("/history/pdf",dependencies=[Depends(get_current_token)])
async def saveHistoryPdf(request: Request, data: ChatHistorySave):
    return await chatBotService.save_history_pdf(request, data.namespace_id, data.messages)

@router.post("/report/detailed",dependencies=[Depends(get_current_token)])
async def generateDetailedReport(request: Request, data: ChatHistorySave, background_tasks: BackgroundTasks):
    try:
        print(f"Received request for detailed report: namespace_id={data.namespace_id}, messages_count={len(data.messages)}")
        return await chatBotService.generate_detailed_report(request, data.namespace_id, data.messages, background_tasks)
    except Exception as e:
        print(f"Error in generateDetailedReport endpoint: {str(e)}")
        from utils.exception import error
        return error(f"Failed to generate report: {str(e)}")

@router.get("/{id}",dependencies=[Depends(get_current_token)])
async def getBotById(id: str):
    return await chatBotService.getBotById(id)

@router.delete("/{id}",dependencies=[Depends(get_current_token)])
async def deleteBot(id: str):
    return await chatBotService.deleteBot(id)

# @router.post("/fileUpload")
# async def upload(namespace_id: str= Form(...),files: List[UploadFile] = File(...),backgroundTasks: BackgroundTasks = None):
#     return await chatBotService.upload_files(namespace_id,files,backgroundTasks)

# @router.get("/files")
# async def getFiles(namespace_id: str):
#     return await chatBotService.get_files(namespace_id)

# @router.delete("/files")
# async def deleteFiles(data:DeleteFilesDTO,backgroundTasks: BackgroundTasks):
#     return await chatBotService.delete_files(data,backgroundTasks)

# @router.delete("/file")
# async def deleteFile(data:DeleteFileDTO,backgroundTasks: BackgroundTasks):
#     return await chatBotService.delete_file(data,backgroundTasks)



 


 