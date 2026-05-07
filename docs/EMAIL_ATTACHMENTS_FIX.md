# Email Attachments Fix - Missing Transcript PDF and Audio

## Problem

Email was being sent successfully but only contained the detailed report PDF. Missing:

- Interview Transcript PDF
- Summary Audio (MP3)

## Root Cause

1. **Transcript PDF**: Was only generated when explicitly downloaded by user, not automatically during report generation.
2. **Summary Audio**: TTS generation could fail silently without clear logging.

## What Was Changed

### 1) `services/chat_bot_service.py`

- Generates transcript PDF automatically if it doesn't exist.
- Generates TTS audio with improved error handling.
- Adds clear logging for each artifact.

### 2) `utils/email_service.py`

- Logs when each attachment is attempted.
- Logs missing files so debugging is straightforward.

## How to Test

1. Complete a new interview session.
2. Click **View Detailed Report** or **Download Detailed Report**.
3. Check server logs for paths and file-exists checks.
4. Check your email for 3 attachments:
   - Transcript PDF
   - Detailed Report PDF
   - Summary Audio MP3

