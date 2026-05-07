from datetime import datetime
import uuid
from fastapi import BackgroundTasks
from utils.success import error, result,success
from models.schemas import KnowledgeBot, User, ChatTranscript, InterviewArtifacts
from dotenv import load_dotenv
from bson import ObjectId
from fastapi.responses import StreamingResponse, FileResponse
import json
import os
from config import constants
load_dotenv()


def _run_report_email_background(
    user_id, user_email, user_name, namespace_id, messages_dict,
    pdf_path, session_questions, qa_pairs, question_scores, total_score,
    selected_topic, summary_text, pinecone_service
):
    """Runs transcript PDF, TTS, artifact save, and email send in background."""
    import re
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import simpleSplit
    transcript_pdf_path = None
    transcript_doc = ChatTranscript.objects(
        user_id=ObjectId(user_id),
        namespace_id=namespace_id
    ).order_by('-created_at').first()

    if transcript_doc and transcript_doc.pdf_path and os.path.exists(transcript_doc.pdf_path):
        transcript_pdf_path = transcript_doc.pdf_path
        print(f"[Background] Using existing transcript PDF: {transcript_pdf_path}")
    else:
        try:
            os.makedirs(os.path.join(constants.UPLOAD_DIR, namespace_id, 'transcripts'), exist_ok=True)
            transcript_file_name = f"transcript_{uuid.uuid4().hex}.pdf"
            transcript_pdf_path = os.path.join(constants.UPLOAD_DIR, namespace_id, 'transcripts', transcript_file_name)
            c_transcript = canvas.Canvas(transcript_pdf_path, pagesize=letter)
            t_width, t_height = letter
            t_margin = 50
            t_y = t_height - t_margin
            c_transcript.setFont('Helvetica-Bold', 16)
            c_transcript.drawString(t_margin, t_y, 'JavaSherpa Interview Transcript')
            t_y -= 40
            for idx, msg in enumerate(messages_dict):
                question = msg.get('question', '')
                answer = msg.get('Ai_response', '')
                if question and question.strip():
                    c_transcript.setFont('Helvetica-Bold', 11)
                    wrapped = simpleSplit(f"User: {question}", 'Helvetica-Bold', 11, t_width - 2*t_margin)
                    for line in wrapped:
                        if t_y < t_margin + 40:
                            c_transcript.showPage()
                            t_y = t_height - t_margin
                        c_transcript.drawString(t_margin, t_y, line)
                        t_y -= 15
                    t_y -= 5
                if answer and answer.strip():
                    c_transcript.setFont('Helvetica', 10)
                    answer_display = f"JavaSherpa: {answer[:500]}..." if len(answer) > 500 else f"JavaSherpa: {answer}"
                    wrapped = simpleSplit(answer_display, 'Helvetica', 10, t_width - 2*t_margin)
                    for line in wrapped:
                        if t_y < t_margin + 40:
                            c_transcript.showPage()
                            t_y = t_height - t_margin
                        c_transcript.drawString(t_margin, t_y, line)
                        t_y -= 14
                    t_y -= 10
            c_transcript.save()
            if transcript_doc:
                transcript_doc.pdf_path = transcript_pdf_path
                transcript_doc.save()
            print(f"[Background] Transcript PDF generated: {transcript_pdf_path}")
        except Exception as e:
            print(f"[Background] Error generating transcript PDF: {str(e)}")
            transcript_pdf_path = None

    summary_audio_path = None
    if summary_text:
        try:
            clean_summary = re.sub(r'\*\*([^\*]+)\*\*', r'\1', summary_text)
            clean_summary = re.sub(r'^#{1,6}\s+', '', clean_summary, flags=re.MULTILINE)
            clean_summary = re.sub(r'```[\s\S]*?```', '', clean_summary)
            clean_summary = re.sub(r'`[^`]+`', '', clean_summary)
            clean_summary = re.sub(r'\n{3,}', '. ', clean_summary)
            clean_summary = re.sub(r'[✓~✗]', '', clean_summary)
            from utils.tts_service import generate_tts_audio
            from models.schemas import UserSettings
            try:
                user_settings = UserSettings.objects(user_id=ObjectId(user_id)).first()
                voice_pref = user_settings.voice if user_settings else "female"
            except Exception:
                voice_pref = "female"
            audio_file_name = f"summary_audio_{uuid.uuid4().hex}.mp3"
            summary_audio_path = os.path.join(constants.UPLOAD_DIR, namespace_id, 'reports', audio_file_name)
            os.makedirs(os.path.dirname(summary_audio_path), exist_ok=True)
            generate_tts_audio(clean_summary, summary_audio_path, voice_pref)
            print(f"[Background] TTS audio generated: {summary_audio_path}")
        except Exception as e:
            print(f"[Background] Error generating TTS audio: {str(e)}")
            summary_audio_path = None

    total_score_str = f"{total_score}/{len(session_questions) if session_questions else len(qa_pairs)}"
    bot = KnowledgeBot.objects(namespace_id=namespace_id).first()
    session_name = bot.bot_name if bot else f"Interview Session {namespace_id[:8]}"
    artifact = InterviewArtifacts(
        user_id=ObjectId(user_id),
        namespace_id=namespace_id,
        session_name=session_name,
        topic=selected_topic,
        transcript_pdf_path=transcript_pdf_path or "",
        detailed_report_pdf_path=pdf_path,
        summary_audio_path=summary_audio_path or "",
        summary_text=summary_text,
        total_score=total_score_str,
        created_at=datetime.now()
    )
    artifact.save()
    print(f"[Background] Interview artifact saved")

    if user_email:
        try:
            from utils.email_service import send_interview_report_email
            send_interview_report_email(
                user_email=user_email,
                user_name=user_name,
                namespace_id=namespace_id,
                transcript_pdf_path=transcript_pdf_path or "",
                detailed_report_pdf_path=pdf_path,
                summary_audio_path=summary_audio_path or "",
                topic=selected_topic,
                score=total_score_str,
                timestamp=datetime.now()
            )
            artifact.sent_to_email = datetime.now()
            artifact.save()
            print(f"[Background] Email sent to {user_email}")
        except Exception as e:
            print(f"[Background] Error sending email: {str(e)}")
            import traceback
            traceback.print_exc()

    pinecone_service.interview_completed[namespace_id] = False
    pinecone_service.current_index[namespace_id] = 0
    pinecone_service.score[namespace_id] = 0
    pinecone_service.session_questions[namespace_id] = []
    pinecone_service.waiting_for_followup[namespace_id] = False
    pinecone_service.question_scores[namespace_id] = {}
    if namespace_id in pinecone_service.interview_summary:
        del pinecone_service.interview_summary[namespace_id]
    print(f"[Background] Report email task completed")


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
        
        return result({"namespace_id": namespace_id}, "Interview session created successfully")
    
    async def getBotByUserId(self,request):  
         id = request.query_params.get('id') if request.query_params.get('id') else request.state.user['id']
         items = KnowledgeBot.objects(user_id =ObjectId(id))

         return result([item.to_mongo().to_dict() for item in items])
        
    
    async def getBotById(self,id): 
         cursor = KnowledgeBot.objects(id = ObjectId(id))  
         return result(cursor.first().to_mongo().to_dict())
    
    async def deleteBot(self, id: str):
        try:
            bot = KnowledgeBot.objects(id=ObjectId(id)).first()
            if not bot:
                return error('Interview session not found')
            bot.delete()
            return success('Interview session deleted successfully')
        except Exception as e:
            return error(f'Error deleting interview session: {str(e)}')
      
    
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
            # Convert Pydantic models to dictionaries before JSON serialization
            messages_dict = []
            for msg in messages:
                if hasattr(msg, 'dict'):
                    messages_dict.append(msg.dict())
                elif hasattr(msg, 'model_dump'):
                    messages_dict.append(msg.model_dump())
                elif isinstance(msg, dict):
                    messages_dict.append(msg)
                else:
                    # Fallback: try to convert to dict
                    messages_dict.append({'question': getattr(msg, 'question', ''), 'Ai_response': getattr(msg, 'Ai_response', '')})
            
            # Check if interview is completed - if so, don't update history
            if self.pineconeService.interview_completed.get(namespace_id, False):
                return result({}, 'Interview completed - history preserved')
            
            # Find existing transcript for this namespace (most recent)
            existing_doc = ChatTranscript.objects(
                user_id=ObjectId(user_id),
                namespace_id=namespace_id
            ).order_by('-created_at').first()
            
            if existing_doc:
                # Update existing transcript
                existing_doc.messages_json = json.dumps(messages_dict)
                existing_doc.save()
                return result({'_id': str(existing_doc.id)}, 'Chat history updated')
            else:
                # Create new transcript entry
                payload = {
                    'user_id': ObjectId(user_id),
                    'namespace_id': namespace_id,
                    'messages_json': json.dumps(messages_dict)
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
            except Exception as e:
                return error('PDF generation dependency missing. Please install reportlab.')

            try:
                os.makedirs(os.path.join(constants.UPLOAD_DIR, namespace_id, 'transcripts'), exist_ok=True)
                file_name = f"transcript_{uuid.uuid4().hex}.pdf"
                pdf_path = os.path.join(constants.UPLOAD_DIR, namespace_id, 'transcripts', file_name)

                c = canvas.Canvas(pdf_path, pagesize=letter)
                width, height = letter
                margin = 50
                y = height - margin
                c.setTitle('JavaSherpa Interview Transcript')
                c.setFont('Helvetica-Bold', 14)
                c.drawString(margin, y, 'JavaSherpa Interview Transcript')
                y -= 24
                # Convert Pydantic models to dictionaries
                messages_dict = []
                for msg in messages:
                    if hasattr(msg, 'dict'):
                        messages_dict.append(msg.dict())
                    elif hasattr(msg, 'model_dump'):
                        messages_dict.append(msg.model_dump())
                    elif isinstance(msg, dict):
                        messages_dict.append(msg)
                    else:
                        messages_dict.append({'question': getattr(msg, 'question', ''), 'Ai_response': getattr(msg, 'Ai_response', '')})
                
                c.setFont('Helvetica', 10)
                for m in messages_dict:
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
                    messages_json=json.dumps(messages_dict),
                    pdf_path=pdf_path
                )
                doc.save()
                    
                # Return the PDF file directly for download
                return FileResponse(
                    pdf_path,
                    media_type='application/pdf',
                    filename=file_name,
                    headers={"Content-Disposition": f"attachment; filename={file_name}"}
                )
            except Exception as e:
                return error(f'Failed to generate PDF: {str(e)}')

    async def generate_detailed_report(self, request, namespace_id: str, messages: list, background_tasks: BackgroundTasks = None):
        """Generate a detailed report with per-question scoring and analysis"""
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.pdfgen import canvas
            from reportlab.lib.utils import simpleSplit
            from reportlab.lib import colors
        except Exception as e:
            return error('PDF generation dependency missing. Please install reportlab.')

        try:
            os.makedirs(os.path.join(constants.UPLOAD_DIR, namespace_id, 'reports'), exist_ok=True)
            file_name = f"detailed_report_{uuid.uuid4().hex}.pdf"
            pdf_path = os.path.join(constants.UPLOAD_DIR, namespace_id, 'reports', file_name)

            c = canvas.Canvas(pdf_path, pagesize=letter)
            width, height = letter
            margin = 50
            y = height - margin

            # Title
            c.setTitle('JavaSherpa Detailed Interview Report')
            c.setFont('Helvetica-Bold', 16)
            c.drawString(margin, y, 'JavaSherpa Detailed Interview Report')
            y -= 30

            # Get interview data from pinecone service
            pinecone_service = self.pineconeService
            session_questions = pinecone_service.session_questions.get(namespace_id, [])
            question_scores = pinecone_service.question_scores.get(namespace_id, {})
            total_score = pinecone_service.score.get(namespace_id, 0)
            selected_topic = pinecone_service.selected_topic.get(namespace_id, "General")

            # Convert messages to dict
            messages_dict = []
            for msg in messages:
                if hasattr(msg, 'dict'):
                    messages_dict.append(msg.dict())
                elif hasattr(msg, 'model_dump'):
                    messages_dict.append(msg.model_dump())
                elif isinstance(msg, dict):
                    messages_dict.append(msg)
                else:
                    messages_dict.append({'question': getattr(msg, 'question', ''), 'Ai_response': getattr(msg, 'Ai_response', '')})

            # Extract Q&A pairs from messages - improved parsing
            qa_pairs = []
            if session_questions:
                # Parse messages to find Q&A pairs by looking for question patterns
                import re
                question_pattern = re.compile(r'(?:Question\s+(\d+)|=====\s*Next Question\s*\((\d+)\)\s*=====)', re.IGNORECASE)
                
                # Build a map of question number to message index
                question_indices = {}  # question_num -> list of message indices where question appears
                for msg_idx, msg in enumerate(messages_dict):
                    ai_resp = msg.get('Ai_response', '')
                    matches = question_pattern.findall(ai_resp)
                    for match in matches:
                        q_num = int(match[0] or match[1]) - 1  # Convert to 0-based index
                        if q_num not in question_indices:
                            question_indices[q_num] = []
                        question_indices[q_num].append(msg_idx)
                
                # For each session question, find its Q&A pair
                for idx, q in enumerate(session_questions):
                    answer = ""
                    feedback = ""
                    
                    # Find where this question appears in messages
                    question_msg_idx = None
                    if idx in question_indices:
                        # Use the first occurrence
                        question_msg_idx = question_indices[idx][0]
                    else:
                        # Fallback: search for question text in AI responses
                        for msg_idx, msg in enumerate(messages_dict):
                            ai_resp = msg.get('Ai_response', '')
                            # Check if question text appears in response
                            if q in ai_resp or any(word in ai_resp.lower() for word in q.lower().split()[:5]):
                                question_msg_idx = msg_idx
                                break
                    
                    if question_msg_idx is not None:
                        # Find user answer after the question
                        for i in range(question_msg_idx + 1, len(messages_dict)):
                            user_q = messages_dict[i].get('question', '')
                            if user_q and len(user_q.strip()) > 3:  # Valid answer
                                answer = user_q
                                # Get feedback from next AI response (skip empty responses)
                                for j in range(i + 1, len(messages_dict)):
                                    next_ai = messages_dict[j].get('Ai_response', '')
                                    if next_ai and len(next_ai.strip()) > 10:
                                        # Check if it's not the next question
                                        if not question_pattern.search(next_ai):
                                            feedback = next_ai
                                        break
                                break
                    
                    qa_pairs.append({
                        'question': q,
                        'answer': answer if answer else "No answer provided",
                        'ai_feedback': feedback if feedback else "No feedback available",
                        'score': question_scores.get(idx, 0)
                    })

            # Report Header Information
            c.setFont('Helvetica-Bold', 12)
            y -= 20
            c.drawString(margin, y, f'Topic: {selected_topic.capitalize()}')
            y -= 20
            c.drawString(margin, y, f'Total Score: {total_score}/{len(session_questions) if session_questions else len(qa_pairs)}')
            y -= 20
            c.drawString(margin, y, f'Date: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
            y -= 30

            # Per-Question Analysis
            c.setFont('Helvetica-Bold', 14)
            c.drawString(margin, y, 'Per-Question Analysis')
            y -= 25

            # Table-style header for quick scan
            table_width = width - 2 * margin
            col_no = 40
            col_score = 80
            col_status = 120
            col_question = table_width - (col_no + col_score + col_status)

            def draw_table_header(current_y):
                c.setFillColorRGB(0.93, 0.95, 0.98)
                c.rect(margin, current_y - 16, table_width, 18, fill=1, stroke=0)
                c.setFillColor(colors.black)
                c.setFont('Helvetica-Bold', 9)
                c.drawString(margin + 4, current_y - 12, "No.")
                c.drawString(margin + col_no + 4, current_y - 12, "Score")
                c.drawString(margin + col_no + col_score + 4, current_y - 12, "Status")
                c.drawString(margin + col_no + col_score + col_status + 4, current_y - 12, "Question")
                c.setStrokeColor(colors.lightgrey)
                c.line(margin, current_y - 18, margin + table_width, current_y - 18)
                c.setStrokeColor(colors.black)
                return current_y - 24

            y = draw_table_header(y)
            for idx, qa in enumerate(qa_pairs):
                if y < margin + 140:
                    c.showPage()
                    y = height - margin
                    y = draw_table_header(y)

                # Score
                score = qa.get('score', 0)
                status_text = "Excellent" if score >= 0.8 else "Good" if score >= 0.5 else "Needs Work"

                # Row top line
                c.setStrokeColor(colors.lightgrey)
                c.line(margin, y + 2, margin + table_width, y + 2)
                c.setStrokeColor(colors.black)

                c.setFont('Helvetica', 9)
                c.drawString(margin + 4, y - 10, str(idx + 1))

                c.setFont('Helvetica-Bold', 9)
                if score >= 0.8:
                    c.setFillColor(colors.green)
                elif score >= 0.5:
                    c.setFillColor(colors.orange)
                else:
                    c.setFillColor(colors.red)
                c.drawString(margin + col_no + 4, y - 10, f"{score:.1f}/1.0")
                c.drawString(margin + col_no + col_score + 4, y - 10, status_text)
                c.setFillColor(colors.black)
                c.setFont('Helvetica', 9)
                question_preview = qa.get('question', 'N/A')
                q_wrap = simpleSplit(question_preview, 'Helvetica', 9, col_question - 8)
                c.drawString(margin + col_no + col_score + col_status + 4, y - 10, q_wrap[0] if q_wrap else "N/A")
                y -= 18

                # Question + answer + feedback block under row (readable details)
                c.setFont('Helvetica-Bold', 10)
                c.drawString(margin + 8, y - 2, f"Question {idx + 1}:")
                y -= 14

                c.setFont('Helvetica', 9)
                wrapped_question = simpleSplit(qa.get('question', 'N/A'), 'Helvetica', 9, width - 2 * margin - 16)
                for line in wrapped_question:
                    c.drawString(margin + 12, y, line)
                    y -= 11

                y -= 2
                c.setFont('Helvetica-Bold', 10)
                c.drawString(margin + 8, y, "Your Answer:")
                y -= 12
                c.setFont('Helvetica', 9)
                wrapped_answer = simpleSplit(qa.get('answer', 'No answer provided'), 'Helvetica', 9, width - 2 * margin - 16)
                for line in wrapped_answer:
                    c.drawString(margin + 12, y, line)
                    y -= 11

                y -= 2
                feedback = qa.get('ai_feedback', '')
                if feedback and len(feedback) > 200:
                    feedback = feedback[:200] + "..."
                if feedback:
                    c.setFont('Helvetica-Bold', 10)
                    c.drawString(margin + 8, y, "AI Feedback:")
                    y -= 12
                    c.setFont('Helvetica', 9)
                    wrapped = simpleSplit(feedback, 'Helvetica', 9, width - 2 * margin - 16)
                    for line in wrapped:
                        c.drawString(margin + 12, y, line)
                        y -= 11

                y -= 10
                c.setStrokeColor(colors.lightgrey)
                c.line(margin, y, margin + table_width, y)
                c.setStrokeColor(colors.black)
                y -= 12

            # Interview Summary Section
            c.showPage()
            y = height - margin
            c.setFont('Helvetica-Bold', 16)
            c.drawString(margin, y, 'Interview Summary')
            y -= 30

            # Get the stored summary from pinecone service
            summary_text = pinecone_service.interview_summary.get(namespace_id, "")
            
            if summary_text:
                # Convert markdown-style summary into PDF-friendly lines while preserving structure
                import re
                summary_text = re.sub(r'\*\*([^\*]+)\*\*', r'\1', summary_text)  # bold
                summary_text = re.sub(r'^#{1,6}\s+', '', summary_text, flags=re.MULTILINE)  # headings
                summary_text = summary_text.replace("\r\n", "\n")
                summary_text = re.sub(r'\n{3,}', '\n\n', summary_text).strip()

                lines = summary_text.split("\n")
                c.setFont('Helvetica', 10)
                for raw_line in lines:
                    line = raw_line.rstrip()

                    # Preserve paragraph spacing
                    if not line.strip():
                        y -= 8
                        continue

                    # Handle horizontal separators
                    if line.strip() == "---":
                        c.setStrokeColor(colors.lightgrey)
                        c.line(margin, y, width - margin, y)
                        c.setStrokeColor(colors.black)
                        y -= 12
                        continue

                    # Keep nested bullet indentation in PDF
                    draw_x = margin
                    max_width = width - 2 * margin
                    text_line = line
                    if line.lstrip().startswith("- "):
                        draw_x = margin + 8
                        max_width = width - (margin + draw_x)
                    elif line.lstrip().startswith("  - "):
                        draw_x = margin + 20
                        max_width = width - (margin + draw_x)
                        text_line = line.strip()[2:]  # keep "- " but remove extra spaces

                    wrapped = simpleSplit(text_line, 'Helvetica', 10, max_width)
                    for wrapped_line in wrapped:
                        if y < margin + 60:
                            c.showPage()
                            y = height - margin
                            c.setFont('Helvetica', 10)
                        c.drawString(draw_x, y, wrapped_line)
                        y -= 14
            else:
                # Fallback: Overall Analysis if summary not available
                c.setFont('Helvetica-Bold', 14)
                c.drawString(margin, y, 'Overall Analysis')
                y -= 25

                c.setFont('Helvetica', 10)
                avg_score = total_score/len(qa_pairs) if qa_pairs else 0
                performance_level = 'Excellent' if avg_score >= 0.8 else 'Good' if avg_score >= 0.6 else 'Needs Improvement' if qa_pairs else 'N/A'
                
                analysis_lines = [
                    f"Total Questions: {len(qa_pairs)}",
                    f"Total Score: {total_score}/{len(qa_pairs)}",
                    f"Average Score: {avg_score:.2f}/1.0",
                    f"Performance Level: {performance_level}",
                    "",
                    "Recommendations:",
                    "- Continue practicing the topics where you scored well",
                    "- Focus on improving areas with lower scores",
                    "- Review the feedback provided for each question"
                ]
                
                for line in analysis_lines:
                    if line.strip():
                        wrapped = simpleSplit(line, 'Helvetica', 10, width - 2*margin)
                        for wline in wrapped:
                            if y < margin + 60:
                                c.showPage()
                                y = height - margin
                                c.setFont('Helvetica', 10)
                            c.drawString(margin, y, wline)
                            y -= 14

            c.save()

            # Get user info
            user_id = request.state.user['id']
            user = User.objects(id=ObjectId(user_id)).first()
            user_email = user.email if user else None
            user_name = user.name if user else "User"
            summary_text = pinecone_service.interview_summary.get(namespace_id, "")

            # Run transcript, TTS, email in background so user gets report quickly
            if background_tasks:
                background_tasks.add_task(
                    _run_report_email_background,
                    user_id=user_id,
                    user_email=user_email,
                    user_name=user_name,
                    namespace_id=namespace_id,
                    messages_dict=messages_dict,
                    pdf_path=pdf_path,
                    session_questions=session_questions,
                    qa_pairs=qa_pairs,
                    question_scores=question_scores,
                    total_score=total_score,
                    selected_topic=selected_topic,
                    summary_text=summary_text,
                    pinecone_service=pinecone_service,
                )
                print("Report PDF ready. Transcript, TTS, and email will be sent in background.")
            else:
                # Fallback: run synchronously if no background_tasks (e.g. tests)
                _run_report_email_background(
                    user_id=user_id,
                    user_email=user_email,
                    user_name=user_name,
                    namespace_id=namespace_id,
                    messages_dict=messages_dict,
                    pdf_path=pdf_path,
                    session_questions=session_questions,
                    qa_pairs=qa_pairs,
                    question_scores=question_scores,
                    total_score=total_score,
                    selected_topic=selected_topic,
                    summary_text=summary_text,
                    pinecone_service=pinecone_service,
                )

            # Return PDF immediately (user sees report in ~5-15 sec instead of ~3 min)
            return FileResponse(
                pdf_path,
                media_type='application/pdf',
                filename=file_name,
                headers={"Content-Disposition": f"attachment; filename={file_name}"}
            )
        except Exception as e:
            return error(f'Error generating detailed report: {str(e)}')





    


