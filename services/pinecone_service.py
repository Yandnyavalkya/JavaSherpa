import os
import random
import re
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
        # Question bank organized by topics
        self.question_bank_by_topic = {
            "polymorphism": [
                "What is polymorphism? Give examples of compile-time and runtime polymorphism.",
                "Explain method overloading vs method overriding in Java.",
                "How does dynamic method dispatch work in Java?",
                "What is the difference between compile-time and runtime polymorphism?",
                "Can you override a static method in Java? Why or why not?",
                "Explain the concept of method resolution in polymorphism.",
                "What is the difference between upcasting and downcasting?",
            ],
            "inheritance": [
                "Explain the concept of inheritance and its types in Java.",
                "What is the difference between single and multiple inheritance in Java?",
                "How does the 'super' keyword work in Java?",
                "What is method overriding and when should you use it?",
                "Explain the 'is-a' relationship in inheritance.",
                "What are the advantages and disadvantages of inheritance?",
                "How do you prevent a class from being inherited in Java?",
            ],
            "collections": [
                "Explain collections vs. arrays. When to use which?",
                "What are ArrayList and LinkedList differences?",
                "Explain HashMap vs Hashtable vs ConcurrentHashMap.",
                "What is the difference between Set and List in Java?",
                "How does HashSet ensure uniqueness of elements?",
                "Explain the Iterator pattern in Java Collections.",
                "What is the difference between Comparable and Comparator?",
            ],
            "memory": [
                "Explain the Java memory model: heap vs stack.",
                "What is garbage collection in Java and how does it work?",
                "What are memory leaks in Java and how can you prevent them?",
                "Explain the difference between heap and stack memory.",
                "What is the purpose of the finalize() method?",
                "How does Java manage memory for objects?",
            ],
            "generics": [
                "What are generics in Java? Benefits and examples.",
                "What is type erasure in Java generics?",
                "Explain wildcards in Java generics (?, ? extends, ? super).",
                "What is the difference between List<Object> and List<?>?",
                "Can you use primitives with generics? Why or why not?",
            ],
            "exceptions": [
                "Explain exceptions vs errors. Checked vs unchecked exceptions.",
                "What is the purpose of a 'try-catch-finally' block?",
                "What is the difference between throw and throws in Java?",
                "Explain exception handling best practices in Java.",
                "What is a custom exception and when would you create one?",
            ],
            "threads": [
                "What are threads? How do you create and manage threads?",
                "What is synchronization in Java? How does 'synchronized' work?",
                "Explain the difference between Thread and Runnable.",
                "What is deadlock and how can you prevent it?",
                "Explain the difference between wait(), notify(), and notifyAll().",
            ],
            "oop": [
                "What is encapsulation and why is it important?",
                "What are interfaces and abstract classes? When to use which?",
                "Explain the four pillars of OOP in Java.",
                "What is the difference between abstraction and encapsulation?",
            ],
            "fundamentals": [
                "What is the difference between primitive and reference data types in Java?",
                "Explain the purpose and use-cases of the 'static' keyword in Java.",
                "Differentiate between '==' and '.equals()' in Java with examples.",
                "What is JVM, JRE, and JDK? How are they related?",
                "What is the 'final', 'finally', and 'finalize' difference?",
            ],
        }
        # Flattened question bank for backward compatibility
        self.question_bank = [q for topic_questions in self.question_bank_by_topic.values() for q in topic_questions]
        # Per-session state
        self.session_questions = {}  # namespace_id -> list[str] of 5 questions
        self.current_index = {}      # namespace_id -> 0..n
        self.score = {}              # namespace_id -> float
        self.waiting_for_followup = {}  # namespace_id -> bool (True if waiting for followup answer)
        self.selected_topic = {}      # namespace_id -> str (selected topic name)
        self.question_scores = {}    # namespace_id -> dict {question_index: score} for detailed report
        self.interview_completed = {}  # namespace_id -> bool (True when interview is complete)
        self.asked_questions_by_topic = {}  # topic -> set of asked questions to avoid repetition
        self.interview_summary = {}  # namespace_id -> str (store summary text separately)

    async def reset_session(self, namespace_id: str):
        self.session_questions[namespace_id] = []
        self.current_index[namespace_id] = 0
        self.score[namespace_id] = 0
        self.waiting_for_followup[namespace_id] = False
        self.selected_topic[namespace_id] = None
        self.question_scores[namespace_id] = {}
        self.interview_completed[namespace_id] = False
        if namespace_id in self.interview_summary:
            del self.interview_summary[namespace_id]
        # Note: Don't reset asked_questions_by_topic - keep it to avoid repetition

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

    async def _ensure_session(self, namespace_id: str):
        if namespace_id not in self.current_index:
            self.current_index[namespace_id] = 0
        if namespace_id not in self.score:
            self.score[namespace_id] = 0
        if namespace_id not in self.waiting_for_followup:
            self.waiting_for_followup[namespace_id] = False
        if namespace_id not in self.selected_topic:
            self.selected_topic[namespace_id] = None
        if namespace_id not in self.session_questions:
            self.session_questions[namespace_id] = []
        if namespace_id not in self.question_scores:
            self.question_scores[namespace_id] = {}
        if namespace_id not in self.interview_completed:
            self.interview_completed[namespace_id] = False

    async def chain_resp(self, namespace_id: str, question: str, chatHistory: str):
        """
        Handles the JavaShepa interview chat logic with per-session randomized questions.
        """

        await self._ensure_session(namespace_id)

        index = pc.Index(os.getenv('PINECONE_INDEX'))
        vectorstore = PineconeVectorStore(
            index=index,
            embedding=embed_model,
            text_key=os.getenv('PINECONE_TEXT_FIELD'),
            namespace=namespace_id
        )

        # Check if topic has been selected
        topic = self.selected_topic.get(namespace_id)
        
        # If no topic selected, try to extract topic from user's message
        if topic is None:
            # Check if user provided a topic
            question_lower = question.lower().strip()
            
            # Filter out common greetings and non-topic words
            greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "thanks", "thank you"]
            if any(greet in question_lower for greet in greetings):
                # Ask for topic selection
                available_topics = ", ".join([t.capitalize() for t in self.question_bank_by_topic.keys()])
                yield f"Hello! I'm JavaShepa — your AI interviewer for today. To get started, please tell me which Java topic you'd like to practice.\n\nYou can choose from our predefined topics: {available_topics}\n\nOr you can specify any Java topic you'd like to practice (e.g., 'classes', 'interfaces', 'streams', 'lambda expressions', etc.)."
                return
            
            # Map common topic variations to our topic keys (for predefined topics)
            topic_keywords = {
                "polymorphism": ["polymorphism", "polymorphic", "method overloading", "method overriding"],
                "inheritance": ["inheritance", "inherit", "extends", "superclass", "subclass"],
                "collections": ["collections", "collection", "arraylist", "linkedlist", "hashmap", "set", "list", "map"],
                "memory": ["memory", "heap", "stack", "garbage collection", "gc"],
                "generics": ["generics", "generic", "type parameter", "wildcard"],
                "exceptions": ["exceptions", "exception", "error", "try catch", "throw"],
                "threads": ["threads", "thread", "multithreading", "concurrency", "synchronization"],
                "oop": ["oop", "object oriented", "encapsulation", "abstraction", "interface", "abstract class"],
                "fundamentals": ["fundamentals", "basics", "primitive", "static", "final", "jvm", "jre", "jdk"],
            }
            
            # Try to match user's input to a predefined topic name (for display purposes)
            detected_topic_name = None
            topic_key = None
            for key, keywords in topic_keywords.items():
                if any(keyword in question_lower for keyword in keywords):
                    detected_topic_name = key
                    topic_key = key
                    break
            
            # Extract the topic name from user input
            if detected_topic_name:
                # Predefined topic detected - use the canonical name
                user_topic = detected_topic_name
            else:
                # Accept any topic the user provides
                user_topic = question.strip()
                # Clean up common phrases
                user_topic = user_topic.replace("i want to practice", "").replace("i'd like to practice", "").replace("practice", "").replace("on", "").strip()
                if not user_topic or len(user_topic) < 2:
                    # Ask for topic selection
                    available_topics = ", ".join([t.capitalize() for t in self.question_bank_by_topic.keys()])
                    yield f"Hello! I'm JavaShepa — your AI interviewer for today. To get started, please tell me which Java topic you'd like to practice.\n\nYou can choose from our predefined topics: {available_topics}\n\nOr you can specify any Java topic you'd like to practice (e.g., 'classes', 'interfaces', 'streams', 'lambda expressions', etc.)."
                    return
            
            # Use LLM to generate questions for ANY topic (both predefined and custom)
            self.selected_topic[namespace_id] = user_topic
            topic_display = user_topic.capitalize()
            
            # Generate questions dynamically using LLM for all topics
            question_generation_prompt = f"""Generate 5 unique Java interview questions specifically about the topic: {user_topic}

Requirements:
- Each question should be focused on {user_topic} in Java
- Questions should be appropriate for a Java interview
- Questions should range from basic to intermediate level
- Make questions specific, practical, and different from common textbook questions
- Format: One question per line, no numbering, no bullet points
- Each question should be a complete sentence ending with a question mark
- Avoid repeating similar questions

Generate exactly 5 unique questions about {user_topic}:"""
            
            chain = llm | StrOutputParser()
            generated_questions_text = "".join([chunk for chunk in chain.stream(question_generation_prompt)])
            
            # Parse generated questions - improved parsing
            lines = generated_questions_text.split('\n')
            generated_questions = []
            for line in lines:
                line = line.strip()
                # Skip empty lines, numbers, bullets, and non-question lines
                if not line or len(line) < 15:
                    continue
                # Remove numbering (1., 2., etc.) and bullets (-, *, etc.)
                line = re.sub(r'^[\d\.\-\*\s]+', '', line)
                line = line.strip()
                # Only include lines that look like questions
                if line.endswith('?') or ('what' in line.lower() or 'how' in line.lower() or 'explain' in line.lower() or 'describe' in line.lower() or 'difference' in line.lower()):
                    if len(line) > 15:  # Valid question length
                        generated_questions.append(line)
                        if len(generated_questions) >= 5:
                            break
            
            # If LLM didn't generate enough questions, generate more
            if len(generated_questions) < 5:
                additional_prompt = f"""Generate {5 - len(generated_questions)} more unique Java interview questions about {user_topic}. Each question should be different from the previous ones. Format: One question per line, no numbering."""
                additional_text = "".join([chunk for chunk in chain.stream(additional_prompt)])
                additional_lines = additional_text.split('\n')
                for line in additional_lines:
                    line = line.strip()
                    if not line or len(line) < 15:
                        continue
                    line = re.sub(r'^[\d\.\-\*\s]+', '', line).strip()
                    if line.endswith('?') or ('what' in line.lower() or 'how' in line.lower() or 'explain' in line.lower()):
                        if len(line) > 15 and line not in generated_questions:
                            generated_questions.append(line)
                            if len(generated_questions) >= 5:
                                break
            
            # Ensure we have exactly 5 questions
            if len(generated_questions) < 5:
                # Fallback: use a mix of general questions if needed
                general_questions = self.question_bank_by_topic.get("fundamentals", [])
                needed = 5 - len(generated_questions)
                if general_questions:
                    generated_questions.extend(random.sample(general_questions, min(needed, len(general_questions))))
            
            # Store the generated questions
            self.session_questions[namespace_id] = generated_questions[:5]
            self.current_index[namespace_id] = 1
            self.score[namespace_id] = 0
            self.question_scores[namespace_id] = {}
            
            first_q = self.session_questions[namespace_id][0]
            yield f"Great! I'll conduct the interview on **{topic_display}**. Let's begin!\n\nQuestion 1: {first_q}"
            return
        
        # Detect greeting after topic is selected (restart interview)
        greetings = ["hi", "hello", "hey", "good morning", "good afternoon"]
        if any(greet in question.lower() for greet in greetings) and self.current_index[namespace_id] == 0 and len(self.session_questions.get(namespace_id, [])) == 0:
            # Generate new questions using LLM for the selected topic
            topic_display = topic.capitalize()
            
            # Generate questions dynamically using LLM
            question_generation_prompt = f"""Generate 5 unique Java interview questions specifically about the topic: {topic}

Requirements:
- Each question should be focused on {topic} in Java
- Questions should be appropriate for a Java interview
- Questions should range from basic to intermediate level
- Make questions specific, practical, and different from common textbook questions
- Format: One question per line, no numbering, no bullet points
- Each question should be a complete sentence ending with a question mark
- Avoid repeating similar questions

Generate exactly 5 unique questions about {topic}:"""
            
            chain = llm | StrOutputParser()
            generated_questions_text = "".join([chunk for chunk in chain.stream(question_generation_prompt)])
            
            # Parse generated questions
            lines = generated_questions_text.split('\n')
            generated_questions = []
            for line in lines:
                line = line.strip()
                if not line or len(line) < 15:
                    continue
                line = re.sub(r'^[\d\.\-\*\s]+', '', line).strip()
                if line.endswith('?') or ('what' in line.lower() or 'how' in line.lower() or 'explain' in line.lower() or 'describe' in line.lower() or 'difference' in line.lower()):
                    if len(line) > 15:
                        generated_questions.append(line)
                        if len(generated_questions) >= 5:
                            break
            
            # If LLM didn't generate enough questions, generate more
            if len(generated_questions) < 5:
                additional_prompt = f"""Generate {5 - len(generated_questions)} more unique Java interview questions about {topic}. Each question should be different from the previous ones. Format: One question per line, no numbering."""
                additional_text = "".join([chunk for chunk in chain.stream(additional_prompt)])
                additional_lines = additional_text.split('\n')
                for line in additional_lines:
                    line = line.strip()
                    if not line or len(line) < 15:
                        continue
                    line = re.sub(r'^[\d\.\-\*\s]+', '', line).strip()
                    if line.endswith('?') or ('what' in line.lower() or 'how' in line.lower() or 'explain' in line.lower()):
                        if len(line) > 15 and line not in generated_questions:
                            generated_questions.append(line)
                            if len(generated_questions) >= 5:
                                break
            
            # Ensure we have 5 questions
            if len(generated_questions) < 5:
                general_questions = self.question_bank_by_topic.get("fundamentals", [])
                needed = 5 - len(generated_questions)
                if general_questions:
                    generated_questions.extend(random.sample(general_questions, min(needed, len(general_questions))))
            
            self.session_questions[namespace_id] = generated_questions[:5]
            self.current_index[namespace_id] = 1
            self.score[namespace_id] = 0
            self.question_scores[namespace_id] = {}
            
            first_q = self.session_questions[namespace_id][0]
            yield f"Hello! Let's continue with **{topic_display}**.\n\nQuestion 1: {first_q}"
            return

        # Interview in progress
        current_idx = self.current_index[namespace_id]
        session_qs = self.session_questions.get(namespace_id, [])
        waiting_for_followup = self.waiting_for_followup.get(namespace_id, False)
        
        if 1 <= current_idx <= len(session_qs):
            last_question = session_qs[current_idx - 1]

            # Check if we're waiting for a followup answer
            if waiting_for_followup:
                # User is answering a followup question, evaluate and move to next interview question
                eval_prompt = f"""
You are JavaShepa, a friendly and encouraging AI Java interviewer. Speak directly to the student in a natural, conversational way.

The student just answered a follow-up question. Evaluate their answer briefly.

Follow-up Answer: {question}

Guidelines:
- Speak directly to the student using "you" and "your" - never refer to them in third person.
- Be warm, encouraging, and conversational - like a helpful mentor.
- Give a very brief, friendly evaluation (1-2 sentences max)
- Write as if you're talking directly to them, not writing about them.
- DO NOT mention moving to the next question - the system will handle that automatically
- Be conversational and concise.

FORMATTING REQUIREMENTS:
- Use proper markdown formatting
- Use line breaks (double newlines) to separate paragraphs
- If providing code examples, use ```java\ncode here\n``` format

- CRITICAL: Do NOT include phrases like "Let's move on", "Next question", or any reference to the next interview question.
                """
                
                chain = llm | StrOutputParser()
                feedback = "".join([chunk for chunk in chain.stream(eval_prompt)])
                
                # Clean feedback to remove any "next question" references
                feedback = re.sub(r'(?i)let\'?s?\s+move\s+on\s+to\s+the\s+next\s+question\s*:?\s*.*?$', '', feedback, flags=re.MULTILINE | re.DOTALL)
                feedback = re.sub(r'(?i)(let\'?s?\s+move\s+on|moving\s+forward|next\s+question|let\'?s?\s+proceed).*?$', '', feedback, flags=re.MULTILINE)
                feedback = feedback.strip()
                
                # Reset followup flag
                self.waiting_for_followup[namespace_id] = False
                
                # Move to next question or generate summary
                if current_idx < len(session_qs):
                    next_q = session_qs[current_idx]
                    self.current_index[namespace_id] += 1
                    yield f"{feedback}\n\n===== Next Question ({current_idx+1}) =====\n{next_q}"
                else:
                    # Generate brief chat message with score and remark
                    # Build question-wise breakdown
                    question_breakdown = []
                    for idx, q in enumerate(session_qs):
                        q_score = self.question_scores.get(namespace_id, {}).get(idx, 0)
                        score_display = "✓" if q_score >= 0.75 else "~" if q_score >= 0.5 else "✗"
                        question_breakdown.append(f"**Q{idx + 1}:** {q} - **Score: {q_score:.1f}/1.0** {score_display}")
                    
                    questions_text = "\n\n".join(question_breakdown)
                    
                    # Generate comprehensive summary for chat display
                    final_prompt = f"""
You are JavaShepa, a friendly and encouraging AI Java interviewer. Generate a comprehensive final interview summary for the student.

Interview Performance:
- Total Score: {self.score[namespace_id]}/{len(session_qs)}
- Percentage: {(self.score[namespace_id]/len(session_qs)*100):.1f}%
- Number of Questions: {len(session_qs)}

Question-wise Performance (for reference):
{questions_text}

Guidelines:
- Speak directly to the student using "you" and "your" - be warm and conversational
- Provide a comprehensive summary with clear sections
- Include the question-wise report showing each question and its score
- Focus on overall performance, strengths, and areas for improvement
- Be encouraging and constructive

FORMATTING REQUIREMENTS (CRITICAL):
- Use proper markdown formatting with double newlines (\\n\\n) between sections
- Use **bold** for section headers and important information
- Use line breaks to separate each section clearly
- Format the question-wise report as a clear, readable list
- Keep paragraphs concise and well-spaced
- Add blank lines before and after code blocks if any

Structure your response EXACTLY like this:

**Interview Session Summary**

**Overall Score:** {self.score[namespace_id]}/{len(session_qs)} ({(self.score[namespace_id]/len(session_qs)*100):.1f}%)

**Question-wise Report:**

{questions_text}

**Performance Analysis:**

**Strengths:**
- (List 2-3 key strengths based on their performance)

**Areas for Improvement:**
- (List 2-3 areas that need improvement)

**Skill Level:** (Beginner / Intermediate / Advanced based on the score)

**Recommendations:**
- (Provide 2-3 specific, actionable suggestions for improvement)

**Closing Remark:**

(Write 2-3 sentences of encouragement and motivation to keep learning)

---

**Your detailed report is available for download and has been sent to your email.**
                    """
                    chain = llm | StrOutputParser()
                    summary = "".join([chunk for chunk in chain.stream(final_prompt)])
                    
                    # Store full summary separately for PDF
                    self.interview_summary[namespace_id] = summary
                    
                    # Yield comprehensive summary for chat display
                    yield f"{feedback}\n\n{summary}"
                    
                    # Mark interview as completed (don't reset state yet - wait for report generation)
                    self.interview_completed[namespace_id] = True
                return

            # Normal answer evaluation
            eval_prompt = f"""
You are JavaShepa, a friendly and encouraging AI Java interviewer. Speak directly to the student in a natural, conversational way - like you're having a one-on-one conversation with them.

Evaluate the student's answer.

Question: {last_question}
Student's Answer: {question}

Guidelines:
- Speak directly to the student using "you" and "your" - never refer to them in third person (don't say "the student" or "they").
- Be warm, encouraging, and conversational - like a helpful mentor, not a formal evaluator.
- If the answer is correct, give a genuine, short compliment (1-2 sentences). DO NOT mention moving to the next question - the system will handle that automatically.
- If the answer is partially correct or incorrect, provide a brief, friendly explanation or hint (2-3 sentences), then ask ONE follow-up question naturally to help them understand better. DO NOT move to the next interview question yet - wait for their answer to the follow-up.
- If the student says they don't know, be encouraging and supportive. Give a brief, friendly explanation (2-3 sentences) and then ask ONE follow-up question naturally to help them learn. DO NOT move to the next interview question yet.
- Write as if you're talking directly to them, not writing about them. For example, say "That's okay! Let me help you understand..." instead of "The student demonstrated honesty..."
- Be conversational and concise.

FORMATTING REQUIREMENTS (CRITICAL):
- Use proper markdown formatting for better readability
- ALWAYS use double newlines (\\n\\n) to separate paragraphs - never write everything in a single paragraph
- If you provide code examples, ALWAYS wrap them in triple backticks with language specification. For Java code, use: ```java\\ncode here\\n```
- CRITICAL: Code blocks MUST be on separate lines from text with blank lines before and after. Format EXACTLY like this:
  
  Here's an example:
  
  ```java
  public class Example {{
      private int value;
      
      // Constructor without parameters
      public Example() {{
          this(0);
      }}
      
      // Constructor with a single parameter
      public Example(int value) {{
          this.value = value;
      }}
  }}
  ```
  
  IMPORTANT RULES FOR CODE BLOCKS (MANDATORY):
  1. Each line of code MUST be on a separate line - NEVER put multiple statements on one line
  2. Use proper indentation (4 spaces) to show code structure
  3. Include blank lines between logical sections (like between constructors or methods)
  4. Preserve ALL line breaks and formatting within the code block
  5. Notice the blank line before ```java and the blank line after the closing ```
  6. NEVER write code blocks like this: "Here's an example:```java" - always add a blank line before the code block
  7. NEVER write code on a single line - ALWAYS format it with proper line breaks
  8. After every semicolon, start a new line
  9. After every opening brace character, start a new line
  10. Before every closing brace character, start a new line
  11. Each method, constructor, or class declaration should be on its own line
  12. Comments should be on their own line or at the end of a line, never concatenated with code
  
- Never embed code inline with text. Always put code in a separate code block with proper spacing and line breaks.
- When asking a follow-up question, ALWAYS format it clearly like this:
  
  **Follow-up Question:**
  
  [Your follow-up question here]
  
  Make sure the follow-up question is on a separate line after "Follow-up Question:"
- Use **bold** for emphasis on important points
- Keep code blocks separate from explanatory text with proper spacing (blank lines before and after)
- Use proper paragraph breaks - never write long paragraphs without breaks

- CRITICAL: Do NOT include phrases like "Let's move on", "Let's move on to the next question", "Next question", "Moving forward", "Let's proceed", or any reference to the next interview question in your response. The system will automatically handle moving to the next question.
- CRITICAL: When asking a follow-up question, just ask the question directly and naturally. Do NOT preface it with "Let's move on" or similar phrases.
- IMPORTANT: Only ask ONE follow-up question. Do NOT include the next interview question in your response.
            """

            chain = llm | StrOutputParser()
            feedback = "".join([chunk for chunk in chain.stream(eval_prompt)])

            # Clean feedback to remove any "next question" references that LLM might have included
            # Remove the entire pattern "Let's move on to the next question: [anything]" including the question that follows
            # This pattern matches from "Let's move on" to the end of the line or until a period/question mark followed by newline
            feedback = re.sub(r'(?i)let\'?s?\s+move\s+on\s+to\s+the\s+next\s+question\s*:?\s*[^\n]*', '', feedback)
            # Remove other variations that might include the question
            feedback = re.sub(r'(?i)(let\'?s?\s+move\s+on|moving\s+forward|let\'?s?\s+proceed)\s+to\s+the\s+next\s+question\s*:?\s*[^\n]*', '', feedback)
            # Remove standalone "next question" references
            feedback = re.sub(r'(?i)next\s+question\s*:?\s*[^\n]*', '', feedback)
            # Remove any question that appears right after "move on" patterns (catches multi-line cases)
            feedback = re.sub(r'(?i)^\s*(can\s+you\s+explain\s+the\s+concept\s+of\s+inheritance[^\n]*)', '', feedback, flags=re.MULTILINE)
            feedback = feedback.strip()

            # Rough scoring logic - improved scoring
            answer_lower = question.lower()
            question_score = 0
            if any(word in answer_lower for word in ["primitive", "object", "reference", "memory", "value", "inheritance", "polymorphism", "encapsulation", "interface", "abstract", "correct", "right", "yes", "explain", "example"]):
                question_score = 1.0
                self.score[namespace_id] += 1
            elif any(word in answer_lower for word in ["maybe", "partly", "somewhat", "not sure", "don't know", "dont know", "i don't know"]):
                question_score = 0.5
                self.score[namespace_id] += 0.5
            else:
                # Check if answer seems comprehensive
                if len(answer_lower.split()) > 10:  # More detailed answer
                    question_score = 0.75
                    self.score[namespace_id] += 0.75
            
            # Store per-question score
            question_index = current_idx - 1  # Current question index (0-based)
            if namespace_id not in self.question_scores:
                self.question_scores[namespace_id] = {}
            self.question_scores[namespace_id][question_index] = question_score

            # Check if feedback contains a followup question
            # Look for question marks and common question words/phrases
            feedback_lower = feedback.lower()
            has_followup_question = (
                "?" in feedback and 
                any(phrase in feedback_lower for phrase in [
                    "can you", "what", "how", "why", "when", "where", "which",
                    "explain", "describe", "tell me", "do you know", 
                    "can you explain", "could you", "would you"
                ]) and
                "next question" not in feedback_lower  # Make sure it's not the next interview question
            )
            
            # Also check if the answer indicates user doesn't know (should trigger followup)
            answer_indicates_unknown = any(phrase in question.lower() for phrase in [
                "don't know", "dont know", "i don't know", "no idea", 
                "not sure", "unsure", "i'm not sure", "im not sure"
            ])
            
            if has_followup_question or answer_indicates_unknown:
                # Set flag to wait for followup answer
                self.waiting_for_followup[namespace_id] = True
                # Only return feedback with followup question, NOT the next interview question
                yield feedback
            else:
                # Answer was correct or no followup needed, move to next question
                if current_idx < len(session_qs):
                    next_q = session_qs[current_idx]
                    self.current_index[namespace_id] += 1
                    yield f"{feedback}\n\n===== Next Question ({current_idx+1}) =====\n{next_q}"
                else:
                    # Build question-wise breakdown
                    question_breakdown = []
                    for idx, q in enumerate(session_qs):
                        q_score = self.question_scores.get(namespace_id, {}).get(idx, 0)
                        score_display = "✓" if q_score >= 0.75 else "~" if q_score >= 0.5 else "✗"
                        question_breakdown.append(f"**Q{idx + 1}:** {q} - **Score: {q_score:.1f}/1.0** {score_display}")
                    
                    questions_text = "\n\n".join(question_breakdown)
                    
                    # Generate comprehensive summary for chat display
                    final_prompt = f"""
You are JavaShepa, a friendly and encouraging AI Java interviewer. Generate a comprehensive final interview summary for the student.

Interview Performance:
- Total Score: {self.score[namespace_id]}/{len(session_qs)}
- Percentage: {(self.score[namespace_id]/len(session_qs)*100):.1f}%
- Number of Questions: {len(session_qs)}

Question-wise Performance (for reference):
{questions_text}

Guidelines:
- Speak directly to the student using "you" and "your" - be warm and conversational
- Provide a comprehensive summary with clear sections
- Include the question-wise report showing each question and its score
- Focus on overall performance, strengths, and areas for improvement
- Be encouraging and constructive

FORMATTING REQUIREMENTS (CRITICAL):
- Use proper markdown formatting with double newlines (\\n\\n) between sections
- Use **bold** for section headers and important information
- Use line breaks to separate each section clearly
- Format the question-wise report as a clear, readable list
- Keep paragraphs concise and well-spaced
- Add blank lines before and after code blocks if any

Structure your response EXACTLY like this:

**Interview Session Summary**

**Overall Score:** {self.score[namespace_id]}/{len(session_qs)} ({(self.score[namespace_id]/len(session_qs)*100):.1f}%)

**Question-wise Report:**

{questions_text}

**Performance Analysis:**

**Strengths:**
- (List 2-3 key strengths based on their performance)

**Areas for Improvement:**
- (List 2-3 areas that need improvement)

**Skill Level:** (Beginner / Intermediate / Advanced based on the score)

**Recommendations:**
- (Provide 2-3 specific, actionable suggestions for improvement)

**Closing Remark:**

(Write 2-3 sentences of encouragement and motivation to keep learning)

---

**Your detailed report is available for download and has been sent to your email.**
                    """
                    chain = llm | StrOutputParser()
                    summary = "".join([chunk for chunk in chain.stream(final_prompt)])

                    # Store full summary separately for PDF
                    self.interview_summary[namespace_id] = summary

                    # Yield comprehensive summary for chat display
                    yield f"{feedback}\n\n{summary}"

                    # Mark interview as completed (don't reset state yet - wait for report generation)
                    self.interview_completed[namespace_id] = True
                    # Don't reset state here - keep it until report is downloaded
