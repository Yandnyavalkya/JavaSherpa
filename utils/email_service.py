import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()


def _get_smtp_client():
    """
    Internal helper to create and return an authenticated SMTP client.
    Returns (server, from_email) or (None, None) if SMTP is not configured.
    """
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_username = os.getenv('SMTP_USERNAME', '')
    smtp_password = os.getenv('SMTP_PASSWORD', '')
    from_email = os.getenv('FROM_EMAIL', smtp_username)

    if not smtp_username or not smtp_password:
        print("Warning: SMTP credentials not configured. Email not sent.")
        return None, None

    server = smtplib.SMTP(smtp_server, smtp_port)
    server.starttls()
    server.login(smtp_username, smtp_password)
    return server, from_email


def send_interview_report_email(user_email: str, user_name: str, namespace_id: str, 
                                transcript_pdf_path: str, detailed_report_pdf_path: str,
                                summary_audio_path: str, topic: str, score: str, timestamp: datetime):
    """
    Send interview report email with attachments (PDFs and audio)
    """
    try:
        # Email configuration from environment variables
        server, from_email = _get_smtp_client()
        if not server:
            return False

        # Create message
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = user_email
        msg['Subject'] = f'JavaSherpa Interview Report - {topic} ({timestamp.strftime("%Y-%m-%d %H:%M")})'
        
        # Email body
        body = f"""
Dear {user_name},

Thank you for completing your Java interview session on JavaSherpa!

Interview Details:
- Topic: {topic}
- Score: {score}
- Date: {timestamp.strftime("%Y-%m-%d %H:%M:%S")}
- Session ID: {namespace_id}

Attached to this email:
1. Interview Transcript (PDF) - Complete conversation history
2. Detailed Report (PDF) - Per-question analysis and summary
3. Summary Audio (MP3) - Audio recording of the interview summary

We hope this helps you in your Java interview preparation!

Best regards,
JavaSherpa Team
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Attach transcript PDF
        if transcript_pdf_path and os.path.exists(transcript_pdf_path):
            print(f"Attaching transcript PDF: {transcript_pdf_path}")
            with open(transcript_pdf_path, 'rb') as f:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header('Content-Disposition', f'attachment; filename=Interview_Transcript_{namespace_id}.pdf')
                msg.attach(part)
        else:
            print(f"Transcript PDF not attached (path: {transcript_pdf_path})")
        
        # Attach detailed report PDF
        if detailed_report_pdf_path and os.path.exists(detailed_report_pdf_path):
            print(f"Attaching detailed report PDF: {detailed_report_pdf_path}")
            with open(detailed_report_pdf_path, 'rb') as f:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header('Content-Disposition', f'attachment; filename=Detailed_Report_{namespace_id}.pdf')
                msg.attach(part)
        else:
            print(f"Detailed report PDF not attached (path: {detailed_report_pdf_path})")
        
        # Attach summary audio
        if summary_audio_path and os.path.exists(summary_audio_path):
            print(f"Attaching summary audio: {summary_audio_path}")
            with open(summary_audio_path, 'rb') as f:
                part = MIMEBase('audio', 'mpeg')
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header('Content-Disposition', f'attachment; filename=Summary_Audio_{namespace_id}.mp3')
                msg.attach(part)
        else:
            print(f"Summary audio not attached (path: {summary_audio_path})")
        
        # Send email
        text = msg.as_string()
        server.sendmail(from_email, user_email, text)
        server.quit()
        
        print(f"Email sent successfully to {user_email}")
        return True
        
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False


def send_password_reset_otp_email(user_email: str, user_name: str, otp: str, valid_minutes: int = 15) -> bool:
    """
    Send a simple email containing a one-time password (OTP) for password reset.
    """
    try:
        server, from_email = _get_smtp_client()
        if not server:
            return False

        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = user_email
        msg['Subject'] = "JavaSherpa Password Reset OTP"

        body = f"""
Dear {user_name},

We received a request to reset the password for your JavaSherpa account.

Your one-time password (OTP) for resetting your password is:

    {otp}

This OTP will be valid for the next {valid_minutes} minutes.

If you did not request a password reset, you can safely ignore this email.

Best regards,
JavaSherpa Team
"""
        msg.attach(MIMEText(body, 'plain'))

        text = msg.as_string()
        server.sendmail(from_email, user_email, text)
        server.quit()

        print(f"Password reset OTP email sent successfully to {user_email}")
        return True
    except Exception as e:
        print(f"Error sending password reset OTP email: {str(e)}")
        return False
