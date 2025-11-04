import os
from config import constants
from utils.backgroud_exeption import handleExceptions
from utils.processor import parse_pdf, parse_text
from dotenv import load_dotenv
from pinecone import Pinecone
from langchain_pinecone import PineconeVectorStore
from langchain_core.output_parsers import StrOutputParser
from langchain.prompts import ChatPromptTemplate
from langchain_mistralai import ChatMistralAI, MistralAIEmbeddings

load_dotenv()

# Embedding & Model setup
embed_model = MistralAIEmbeddings(
    model=os.getenv('MISTRAL_EMBED_MODEL'),
    api_key=os.getenv('MISTRAL_API_KEY'),
)

llm = ChatMistralAI(
    mistral_api_key=os.getenv('MISTRAL_API_KEY'),
    model=os.getenv('MISTRAL_MODEL'),
    temperature=0,
)

pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'), environment=os.getenv('PINECONE_ENV'))


class PineconeService:

    def __init__(self):
        self.interview_questions = [
            "What is the difference between primitive and reference data types in Java?",
            "What is the purpose of the 'static' keyword in Java?",
            "What is the difference between '==' and '.equals()' in Java?",
            "What is the purpose of the 'try-catch' block in Java?",
            "What is the difference between 'System.out.println()' and 'System.out.print()' in Java?"
        ]
        self.current_index = {}
        self.score = {}

    @handleExceptions
    async def vectorize_documents_main(self, namespace_id: str):
        import traceback
        print("=" * 70)
        print(f"[INFO] Starting vectorization for namespace: {namespace_id}")
        in_process_dir: str = os.path.join(constants.UPLOAD_DIR, namespace_id, constants.PRIMARY_FOLDER)
        print(f"[INFO] Upload folder path: {in_process_dir}")

        if not os.path.exists(in_process_dir):
            print(f"[ERROR] Directory not found: {in_process_dir}")
            return {"error": "Upload directory not found"}

        documents = {namespace_id: []}
        
        for file in os.listdir(in_process_dir):
            file_path: str = os.path.join(in_process_dir, file)
            if os.path.isdir(file_path):
                print(f"[SKIP] Skipping subdirectory: {file}")
                continue

            file_ext = file.split('.')[-1].lower()
            print(f"[INFO] Processing file: {file} (type: {file_ext})")

            try:
                if file_ext == 'txt':
                    docs = parse_text(file_path)
                elif file_ext == 'pdf':
                    docs = parse_pdf(file_path)
                else:
                    print(f"[WARN] Unsupported file type: {file_ext}. Skipping.")
                    continue

                print(f"[DEBUG] Parsed {len(docs)} text chunks from {file}")
                documents[namespace_id].extend(docs)

                os.remove(file_path)
                print(f"[INFO] Removed file after processing: {file_path}")

            except Exception as e:
                print(f"[ERROR] Failed to parse {file}: {str(e)}")
                traceback.print_exc()

        if not documents[namespace_id]:
            print("[WARN] No text extracted from any document. Nothing to embed.")
            return {"message": "No valid text found in uploaded documents."}

        try:
            test_vector = embed_model.embed_query("hello world")
            print(f"[DEBUG] Embedding model test successful. Vector dimension = {len(test_vector)}")
        except Exception as e:
            print(f"[ERROR] Embedding model failed: {e}")
            traceback.print_exc()
            return {"error": "Embedding model not working properly"}

        try:
            index_name = os.getenv('PINECONE_INDEX')
            print(f"[INFO] Checking Pinecone index: {index_name}")
            existing_indexes = [idx.name for idx in pc.list_indexes()]
            print(f"[DEBUG] Existing indexes: {existing_indexes}")
            if index_name not in existing_indexes:
                print(f"[WARN] Index '{index_name}' not found. Creating new index...")
                pc.create_index(name=index_name, dimension=len(test_vector), metric="cosine")
        except Exception as e:
            print(f"[ERROR] Failed to connect or create Pinecone index: {e}")
            traceback.print_exc()
            return {"error": "Pinecone index connection failed"}
        try:
            print(f"[INFO] Uploading embeddings to Pinecone namespace: {namespace_id}")
            vectorstore = PineconeVectorStore.from_documents(
                documents[namespace_id],
                index_name=index_name,
                embedding=embed_model,
                namespace=namespace_id
            )
            print("[SUCCESS] Embeddings uploaded successfully to Pinecone!")
        except Exception as e:
            print(f"[ERROR] Pinecone upload failed: {e}")
            traceback.print_exc()
            return {"error": "Failed to upload vectors to Pinecone"}
        try:
            index = pc.Index(index_name)
            stats = index.describe_index_stats()
            count = stats.get("namespaces", {}).get(namespace_id, {}).get("vector_count", 0)
            print(f"[INFO] Namespace '{namespace_id}' now contains {count} vectors in Pinecone.")
        except Exception as e:
            print(f"[WARN] Could not fetch Pinecone stats: {e}")

        print("=" * 70)
        return {"message": "File uploaded and embedded successfully!"}

    @handleExceptions
    async def delete_vectorized_docs(self, namespace_id: str, key: str, values: list[str]):
        index = pc.Index(os.getenv('PINECONE_INDEX'))
        filter_condition = {key: {"$in": values}}
        response = index.delete(delete_all=False, namespace=namespace_id, filter=filter_condition)
        return response

    async def chain_resp(self, namespace_id: str, question: str, chatHistory: str):
        """
        Handles the JavaShepa interview chat logic.
        """

        # Initialize namespace state
        if namespace_id not in self.current_index:
            self.current_index[namespace_id] = 0
            self.score[namespace_id] = 0

        index = pc.Index(os.getenv('PINECONE_INDEX'))
        vectorstore = PineconeVectorStore(
            index=index,
            embedding=embed_model,
            text_key=os.getenv('PINECONE_TEXT_FIELD'),
            namespace=namespace_id
        )

        # Detect greeting and start interview
        greetings = ["hi", "hello", "hey", "good morning", "good afternoon"]
        if any(greet in question.lower() for greet in greetings) and self.current_index[namespace_id] == 0:
            first_q = self.interview_questions[0]
            self.current_index[namespace_id] = 1
            yield f"Hello! I’m JavaShepa — your AI interviewer for today. Let’s begin with the topic *Java Fundamentals.*\n\nQuestion 1: {first_q}"
            return

        # Interview in progress
        current_idx = self.current_index[namespace_id]
        if 1 <= current_idx <= len(self.interview_questions):
            last_question = self.interview_questions[current_idx - 1]

            eval_prompt = f"""
You are JavaShepa, an AI Java interviewer.

Evaluate the student's answer.

Question: {last_question}
Student's Answer: {question}

Guidelines:
- If the answer is correct, give a short compliment and move to the next question.
- If the answer is partially correct, ask a short follow-up question or give a hint, then move on.
- If the answer is incorrect, provide a brief clue (not the full answer), then move on.
- Be conversational and concise.
            """

            chain = llm | StrOutputParser()
            feedback = "".join([chunk for chunk in chain.stream(eval_prompt)])  # ✅ fixed sync streaming

            # Rough scoring logic
            answer_lower = question.lower()
            if any(word in answer_lower for word in ["primitive", "object", "reference", "memory", "value"]):
                self.score[namespace_id] += 1
            elif any(word in answer_lower for word in ["maybe", "partly", "somewhat", "not sure"]):
                self.score[namespace_id] += 0.5

            # Move to next question or generate summary
            if current_idx < len(self.interview_questions):
                next_q = self.interview_questions[current_idx]
                self.current_index[namespace_id] += 1
                yield f"{feedback}\n\nNext Question ({current_idx+1}): {next_q}"
            else:
                final_prompt = f"""
Generate a final Java interview summary for the student.

Details:
- Total Score: {self.score[namespace_id]}/5
- Context: {chatHistory}

Include:
- Score
- Strengths
- Weak Areas
- Level (Beginner / Intermediate / Advanced)
- Suggestions
- Encouraging Remark
                """

                summary = "".join([chunk for chunk in chain.stream(final_prompt)])  # ✅ also fixed

                yield f"{feedback}\n\n{summary}"

                # Reset interview state
                self.current_index[namespace_id] = 0
                self.score[namespace_id] = 0
