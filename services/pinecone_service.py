import os
from config import constants
from utils.backgroud_exeption import handleExceptions
from utils.processor import parse_pdf,parse_text
from dotenv import load_dotenv
from pinecone import Pinecone
load_dotenv()
from langchain_pinecone import  PineconeVectorStore
from langchain_core.output_parsers import StrOutputParser
from langchain.prompts import ChatPromptTemplate 
from langchain_mistralai import ChatMistralAI,MistralAIEmbeddings
 

embed_model = MistralAIEmbeddings(
    model=os.getenv('MISTRAL_EMBED_MODEL'), 
    api_key=os.getenv('MISTRAL_API_KEY'),
    
)

llm = ChatMistralAI(
            mistral_api_key=os.getenv('MISTRAL_API_KEY'),
            model=os.getenv('MISTRAL_MODEL'),
            temperature=0, 
             )

pc=Pinecone(api_key=os.getenv('PINECONE_API_KEY'), environment=os.getenv('PINECONE_ENV'))

class PineconeService:  
    
    @handleExceptions
    async def vectorize_documents_main(self,namespace_id: str):
            in_process_dir: str = os.path.join(constants.UPLOAD_DIR, namespace_id, constants.PRIMARY_FOLDER)
    
            documents = dict()
            documents[namespace_id] = list()

            for file in os.listdir(in_process_dir):
                if os.path.isdir(file):
                    print(f"Skipping {file}")
                    continue

                if not os.path.isdir(file):
                    file_path: str = os.path.join(in_process_dir, file)
                    print(f"Processing file: {file}")
                    file_ext = file.split('.')[-1]
                    if file_ext == 'txt':
                        documents[namespace_id].extend(parse_text(file_path))
                    elif file_ext == 'pdf':
                        documents[namespace_id].extend(parse_pdf(file_path))

                    os.remove(file_path)

            pinecone_namespace = namespace_id

            for key, val in documents.items(): 
                vectorstore_from_docs_faq = PineconeVectorStore.from_documents(
                    documents[key],
                    index_name=os.getenv('PINECONE_INDEX'),
                    embedding=embed_model,
                    namespace=pinecone_namespace
                )
            return {"message":"File uploaded successful !"}

    @handleExceptions
    async def delete_vectorized_docs(self, namespace_id: str, key: str, values: list[str]):
        index = pc.Index(os.getenv('PINECONE_INDEX'))   
        filter_condition = {key: {"$in": values}}
        response = index.delete(delete_all=False, namespace=namespace_id, filter=filter_condition)
        return response   

    async def chain_resp(self,namespace_id: str,question: str, chatHistory: str):
         
 
        template = """Answer the user's question based on the provided document content. Respond to general conversational cues (like greetings, follow-ups, or small talk) interactively without referencing the document. For example, respond to greetings (e.g., "Hi," "Hello", "Help Me Out") with an appropriate greeting in return, or engage in follow-up questions with a conversational tone.

            Input:

            File Content: {fileContent}
            Chat History: {chatHistory}
            Question: {question}
            
            Additional Guidelines:

            1. Chat History for Relevance: Use the chat history to evaluate the relevance of the question. **If and only if** the question relates to the content of the document, provide relevant references by citing sections with page numbers and file names in the following structure:

                For More Reference, See Page Number: X in File Name: Y <Paragraph>.

            2. If the user is not specific, or multiple references are relevant for the single answer, provide one appropriate answer, but list all relevant references, formatted as:

                For More Reference:
                - See Page Number: X in File Name: Y <Paragraph>.
                - See Page Number: Z in File Name: W <Paragraph>.

            3. Translate this citation line and response into the same language as the question (e.g., Arabic for Arabic, French for French, English for English).
           
            4. **If the question does not relate to the document, do not provide any citation**."""


        index = pc.Index(os.getenv('PINECONE_INDEX'))
     
        prompt_template = ChatPromptTemplate.from_template(template)

        vectorstore = PineconeVectorStore(
            index=index, embedding=embed_model, text_key=os.getenv('PINECONE_TEXT_FIELD'), namespace=namespace_id
        ) 
 
        retrieved_data = vectorstore.similarity_search(question,namespace=namespace_id, k=20)
         
        fileContent = ""
 
        for doc in retrieved_data: 
            if doc.metadata.get("type") == "pdf":
                
                 fileContent += f"{doc.page_content.strip()} \n Page No :{doc.metadata['page']} \n File Name : {doc.metadata['name']}" 
            else:
                 fileContent += f"{doc.page_content.strip()} \n File Name : {doc.metadata['name']}" 
                  
        if fileContent is None:
            yield "There is no answer to your question in the document."
        else:   
           
            prompt =  prompt_template.format(question=question,chatHistory=chatHistory,fileContent = fileContent)
             
            chain = llm | StrOutputParser()

            for chunk in chain.stream(prompt):
                    yield chunk 
  
          
      
            