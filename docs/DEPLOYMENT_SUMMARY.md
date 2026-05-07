# JavaSherpa - Deployment Summary

This document summarizes features and deployment steps.

## Docs Index

- Architecture (root):
  - `architecture.md`
  - `ARCHITECTURE_DIAGRAM.md`
- Setup and troubleshooting (this folder):
  - `EMAIL_SETUP_GUIDE.md`
  - `EMAIL_ATTACHMENTS_FIX.md`
  - `TTS_AUDIO_FIX.md`
  - `FIXES_FOR_400_ERROR.md`
  - `SAMPLE_INTERVIEW_SUMMARY.md`

## Run Locally

### Backend

```bash
python -m venv venv
venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 9000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

