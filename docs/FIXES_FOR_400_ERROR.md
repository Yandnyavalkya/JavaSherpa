# Fixes for 400 Bad Request Error and Report Issues

## Problems Identified

1. 400 Bad Request when generating detailed reports
2. Email not being sent after interview completion

## Typical Root Causes

- Request validation rejecting messages with unexpected fields
- Messages not being formatted consistently client-side
- Missing error handling / logging around report endpoints

## What to Check

- Backend logs when calling `/chat-bot/report/detailed`
- Browser console payload shape (namespace + messages array)
- `.env` SMTP configuration (see `docs/EMAIL_SETUP_GUIDE.md`)

