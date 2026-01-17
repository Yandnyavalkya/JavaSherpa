# Email Setup Guide for JavaSherpa

This guide will help you configure the email functionality to send interview reports to users.

## Step 1: Create/Update .env File

Create a `.env` file in the root directory (`d:\java_sherpa\.env`) if it doesn't exist, or add the following variables to your existing `.env` file:

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
   - Go to your Google Account: https://myaccount.google.com/
   - Navigate to Security → 2-Step Verification
   - Enable 2-Step Verification if not already enabled

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
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

### Option B: Outlook/Hotmail

1. **Enable 2-Factor Authentication**
   - Go to: https://account.microsoft.com/security
   - Enable 2FA if not already enabled

2. **Generate App Password**
   - Go to: https://account.microsoft.com/security/app-passwords
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
   - Go to: https://login.yahoo.com/account/security
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

For custom SMTP servers (like SendGrid, Mailgun, etc.):

```env
SMTP_SERVER=smtp.sendgrid.net  # or your SMTP server
SMTP_PORT=587  # or 465 for SSL
SMTP_USERNAME=apikey  # or your SMTP username
SMTP_PASSWORD=your-api-key-or-password
FROM_EMAIL=noreply@yourdomain.com
```

## Step 3: Verify .env File Location

Make sure your `.env` file is in the root directory:
```
d:\java_sherpa\.env
```

The file should contain:
```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password-here
FROM_EMAIL=your-email@gmail.com
```

## Step 4: Test Email Functionality

### Method 1: Test via Interview Completion

1. Complete an interview session
2. Generate a detailed report
3. Check the server logs for:
   - `"Email sent successfully to {email}"` - Success
   - `"Warning: SMTP credentials not configured"` - Configuration missing
   - `"Error sending email: {error}"` - Configuration issue

### Method 2: Create a Test Script

Create a test file `test_email.py` in the root directory:

```python
from utils.email_service import send_interview_report_email
from datetime import datetime
import os

# Test email
test_email = "your-test-email@gmail.com"  # Replace with your test email
test_name = "Test User"
namespace_id = "test-123"
topic = "Polymorphism"
score = "4/5"

# Note: These paths should exist for the test
transcript_path = "upload/test/transcript.pdf"  # Optional - can be empty string
report_path = "upload/test/report.pdf"  # Optional - can be empty string
audio_path = "upload/test/audio.mp3"  # Optional - can be empty string

result = send_interview_report_email(
    user_email=test_email,
    user_name=test_name,
    namespace_id=namespace_id,
    transcript_pdf_path=transcript_path or "",
    detailed_report_pdf_path=report_path or "",
    summary_audio_path=audio_path or "",
    topic=topic,
    score=score,
    timestamp=datetime.now()
)

if result:
    print("✅ Email sent successfully!")
else:
    print("❌ Email failed to send. Check your .env configuration.")
```

Run the test:
```bash
python test_email.py
```

## Step 5: Troubleshooting

### Common Issues:

1. **"SMTP credentials not configured"**
   - Check that `.env` file exists in root directory
   - Verify all SMTP variables are set
   - Restart the server after updating `.env`

2. **"Authentication failed"**
   - For Gmail: Make sure you're using an App Password, not your regular password
   - Verify 2FA is enabled
   - Check that SMTP_USERNAME matches your email exactly

3. **"Connection refused" or "Connection timeout"**
   - Check firewall settings
   - Verify SMTP_SERVER and SMTP_PORT are correct
   - Try port 465 with SSL instead of 587 with TLS

4. **"Email sent but not received"**
   - Check spam/junk folder
   - Verify recipient email address is correct
   - Check email provider's sending limits

### Gmail-Specific Notes:

- **App Passwords are required** - Regular passwords won't work
- **Less secure app access is deprecated** - Use App Passwords instead
- **Rate limits**: Gmail allows ~500 emails per day for free accounts

## Step 6: Security Best Practices

1. **Never commit .env file to Git**
   - Ensure `.env` is in `.gitignore`
   - Use environment variables in production

2. **Use App Passwords**
   - Never use your main account password
   - Generate unique app passwords for each service

3. **Production Deployment**
   - Use environment variables in your hosting platform
   - Consider using email services like SendGrid, Mailgun, or AWS SES for production

## Step 7: Verify Email is Working

After completing an interview and generating a detailed report, you should see in the server logs:
```
Email sent successfully to user@example.com
```

And the user should receive an email with:
- Interview Transcript PDF
- Detailed Report PDF  
- Summary Audio (MP3)

## Additional Configuration Options

### For Production (SendGrid Example):

```env
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
```

### For AWS SES:

```env
SMTP_SERVER=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=your-aws-smtp-username
SMTP_PASSWORD=your-aws-smtp-password
FROM_EMAIL=noreply@yourdomain.com
```

## Need Help?

If you encounter issues:
1. Check server logs for specific error messages
2. Verify `.env` file syntax (no quotes needed around values)
3. Test SMTP connection using the test script
4. Check email provider's documentation for SMTP settings
