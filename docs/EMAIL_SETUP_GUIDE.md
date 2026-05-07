# Email Setup Guide for JavaSherpa

This guide will help you configure the email functionality to send interview reports to users.

## Step 1: Create or Update .env File

Create a `.env` file in the project root if it doesn't exist, or add the following variables to your existing `.env` file:

```env
# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
```

## Step 2: Choose Your Email Provider

### Option A: Gmail (Recommended for Testing)

1. **Enable 2-Factor Authentication (2FA)**
   - Go to your Google Account: `https://myaccount.google.com/`
   - Navigate to Security → 2-Step Verification
   - Enable 2-Step Verification if not already enabled

2. **Generate App Password**
   - Go to: `https://myaccount.google.com/apppasswords`
   - Select "Mail" and "Other (Custom name)"
   - Enter "JavaSherpa" as the app name
   - Click "Generate"
   - Copy the 16-character password (no spaces)

3. **Update .env file:**

```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # Use the app password (remove spaces)
FROM_EMAIL=your-email@gmail.com
```

### Option B: Outlook or Hotmail

1. **Enable 2-Factor Authentication**
   - Go to: `https://account.microsoft.com/security`
   - Enable 2FA if not already enabled

2. **Generate App Password**
   - Go to: `https://account.microsoft.com/security/app-passwords`
   - Create a new app password for "Mail"
   - Copy the generated password

3. **Update .env file:**

```env
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=your-email@outlook.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@outlook.com
```

### Option C: Yahoo Mail

1. **Generate App Password**
   - Go to: `https://login.yahoo.com/account/security`
   - Enable 2FA if not enabled
   - Generate an app-specific password

2. **Update .env file:**

```env
SMTP_SERVER=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USERNAME=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@yahoo.com
```

### Option D: Custom SMTP Server

For custom SMTP servers (SendGrid, Mailgun, etc.):

```env
SMTP_SERVER=smtp.sendgrid.net  # or your SMTP server
SMTP_PORT=587  # or 465 for SSL
SMTP_USERNAME=apikey  # or your SMTP username
SMTP_PASSWORD=your-api-key-or-password
FROM_EMAIL=noreply@yourdomain.com
```

## Step 3: Verify .env File Location

Make sure your `.env` file is in the project root. Restart the backend after updating it.

## Step 4: Test Email Functionality

### Method 1: Test via Interview Completion

1. Complete an interview session
2. Generate a detailed report
3. Check the server logs for:
   - `"Email sent successfully to {email}"` - Success
   - `"Warning: SMTP credentials not configured"` - Configuration missing
   - `"Error sending email: {error}"` - Configuration issue

### Method 2: Create a Test Script

Create a test file `test_email.py` in the project root:

```python
from utils.email_service import send_interview_report_email
from datetime import datetime

test_email = "your-test-email@gmail.com"
test_name = "Test User"
namespace_id = "test-123"
topic = "Polymorphism"
score = "4/5"

transcript_path = "upload/test/transcript.pdf"
report_path = "upload/test/report.pdf"
audio_path = "upload/test/audio.mp3"

result = send_interview_report_email(
    user_email=test_email,
    user_name=test_name,
    namespace_id=namespace_id,
    transcript_pdf_path=transcript_path or "",
    detailed_report_pdf_path=report_path or "",
    summary_audio_path=audio_path or "",
    topic=topic,
    score=score,
    timestamp=datetime.now(),
)

print("✅ Email sent successfully!" if result else "❌ Email failed. Check .env configuration.")
```

Run:

```bash
python test_email.py
```

## Step 5: Troubleshooting (Quick)

- **SMTP credentials not configured**: verify `.env` exists and backend restarted.
- **Authentication failed**: use Gmail App Password, not regular password.
- **Email sent but not received**: check spam/junk, verify recipient address.

