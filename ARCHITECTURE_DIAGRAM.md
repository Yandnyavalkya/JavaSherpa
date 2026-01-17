# JavaSherpa - System Architecture

## 🏗️ High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Frontend - React Application"
        A[User Browser] --> B[React App - Vite]
        B --> C[Pages]
        C --> D[Home Page]
        C --> E[Auth Pages]
        C --> F[Chat/Interview Page]
        B --> G[Components]
        G --> H[ChatPage]
        G --> I[BotList]
        G --> J[Settings Modal]
        G --> K[Report Modal]
        B --> L[Services]
        L --> M[API Service]
        L --> N[Axios Client]
    end

    subgraph "Backend - FastAPI Application"
        O[FastAPI Server] --> P[Routers]
        P --> Q[User Router]
        P --> R[ChatBot Router]
        O --> S[Services]
        S --> T[User Service]
        S --> U[ChatBot Service]
        S --> V[Pinecone Service]
        O --> W[Utils]
        W --> X[Email Service]
        W --> Y[TTS Service]
        W --> Z[JWT Handler]
        O --> AA[Models]
        AA --> AB[DTOs - Pydantic]
        AA --> AC[Schemas - MongoEngine]
    end

    subgraph "External Services"
        AD[(MongoDB)]
        AE[(Pinecone Vector DB)]
        AF[Mistral AI LLM]
        AG[SMTP Server - Gmail]
    end

    subgraph "Storage"
        AH[/Upload Directory/]
        AI[Transcript PDFs]
        AJ[Detailed Report PDFs]
        AK[Audio MP3 Files]
    end

    %% Frontend to Backend connections
    M -->|HTTP/REST API| O
    
    %% Backend to External Services
    T -->|CRUD Operations| AD
    U -->|Save/Retrieve Data| AD
    V -->|Vector Search| AE
    V -->|Generate Questions/Evaluate| AF
    U -->|Generate Reports| AF
    X -->|Send Emails| AG
    
    %% Backend to Storage
    U -->|Save PDFs| AH
    Y -->|Generate Audio| AH
    AH --> AI
    AH --> AJ
    AH --> AK
    
    %% User flows
    A -.->|Login/Register| E
    A -.->|Start Interview| F
    A -.->|View Reports| K

    style A fill:#4CAF50,stroke:#2E7D32,color:#fff
    style B fill:#2196F3,stroke:#1565C0,color:#fff
    style O fill:#FF9800,stroke:#E65100,color:#fff
    style AD fill:#9C27B0,stroke:#6A1B9A,color:#fff
    style AE fill:#00BCD4,stroke:#006064,color:#fff
    style AF fill:#E91E63,stroke:#880E4F,color:#fff
    style AG fill:#F44336,stroke:#B71C1C,color:#fff
    style AH fill:#795548,stroke:#3E2723,color:#fff
```

---

## 🔄 Data Flow Diagrams

### 1. User Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as FastAPI
    participant DB as MongoDB
    participant JWT as JWT Handler

    U->>F: Enter credentials
    F->>API: POST /user/login
    API->>DB: Query user by email
    DB-->>API: User data
    API->>API: Verify password (bcrypt)
    API->>JWT: Generate JWT token
    JWT-->>API: Token
    API-->>F: {token, user_info}
    F->>F: Store token in localStorage
    F-->>U: Redirect to dashboard
```

### 2. Interview Session Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as ChatBot Router
    participant PS as Pinecone Service
    participant LLM as Mistral AI
    participant PC as Pinecone DB
    participant DB as MongoDB

    U->>F: Select Java topic
    F->>API: POST /chat-bot/chat
    API->>PS: Process question
    PS->>LLM: Generate questions for topic
    LLM-->>PS: Generated questions
    PS->>PS: Store in session
    PS-->>API: First question
    API-->>F: Stream response
    F-->>U: Display question
    
    U->>F: Submit answer
    F->>API: POST /chat-bot/chat
    API->>PS: Evaluate answer
    PS->>PC: Search similar answers
    PC-->>PS: Context
    PS->>LLM: Evaluate with context
    LLM-->>PS: Feedback + score
    PS->>PS: Update score
    PS-->>API: Feedback + next question
    API-->>F: Stream response
    F-->>U: Display feedback
    
    Note over PS: Repeat until all questions answered
    
    PS->>LLM: Generate final summary
    LLM-->>PS: Comprehensive summary
    PS->>DB: Save interview state
    DB-->>PS: Saved
    PS-->>API: Summary with score
    API-->>F: Final summary
    F-->>U: Display summary + report buttons
```

### 3. Report Generation & Email Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as ChatBot Router
    participant CS as ChatBot Service
    participant PS as Pinecone Service
    participant TTS as TTS Service
    participant ES as Email Service
    participant DB as MongoDB
    participant FS as File System
    participant SMTP as Gmail SMTP

    U->>F: Click "View Detailed Report"
    F->>API: POST /chat-bot/report/detailed
    API->>CS: Generate detailed report
    
    par Generate Transcript PDF
        CS->>FS: Create transcript PDF
        FS-->>CS: transcript.pdf path
    and Generate Detailed Report PDF
        CS->>PS: Get session data (questions, scores)
        PS-->>CS: Session data
        CS->>FS: Create detailed report PDF
        FS-->>CS: detailed_report.pdf path
    and Generate Audio
        CS->>PS: Get interview summary
        PS-->>CS: Summary text
        CS->>TTS: Generate audio from summary
        TTS->>FS: Save audio.mp3
        FS-->>TTS: audio.mp3 path
        TTS-->>CS: Audio path
    end
    
    CS->>DB: Save artifact paths to InterviewArtifacts
    DB-->>CS: Saved
    
    CS->>ES: Send email with attachments
    ES->>FS: Read PDF and audio files
    FS-->>ES: File contents
    ES->>SMTP: Send email with attachments
    SMTP-->>ES: Email sent
    ES-->>CS: Success
    
    CS->>DB: Update sent_to_email timestamp
    DB-->>CS: Updated
    
    CS->>FS: Read detailed report PDF
    FS-->>CS: PDF blob
    CS-->>API: PDF response
    API-->>F: PDF blob
    F->>F: Display in modal
    F-->>U: Show report with download/share options
```

---

## 📊 Component Architecture

### Frontend Architecture

```mermaid
graph TD
    subgraph "React Application Structure"
        A[App.jsx - Root] --> B[MainRoute]
        B --> C[Public Routes]
        B --> D[Protected Routes]
        
        C --> E[Home Page]
        C --> F[Login Page]
        C --> G[Register Page]
        
        D --> H[Default Layout]
        H --> I[Header Component]
        H --> J[BotList Sidebar]
        H --> K[ChatPage Component]
        
        K --> L[Message Display]
        K --> M[Input Controls]
        K --> N[TTS Controls]
        K --> O[Report Modal]
        
        L --> P[ReactMarkdown]
        P --> Q[Syntax Highlighter]
        P --> R[Code Block Components]
        
        I --> S[Settings Modal]
        
        T[API Service] --> U[Axios Client]
        U --> V[HTTP Interceptors]
        
        K -.->|Uses| T
        F -.->|Uses| T
        G -.->|Uses| T
    end
    
    style A fill:#61DAFB,stroke:#000,color:#000
    style K fill:#61DAFB,stroke:#000,color:#000
    style T fill:#FF6B6B,stroke:#000,color:#fff
```

### Backend Architecture

```mermaid
graph TD
    subgraph "FastAPI Application Structure"
        A[app.py - Main] --> B[Router Registration]
        B --> C[User Router]
        B --> D[ChatBot Router]
        
        D --> E[ChatBot Endpoints]
        E --> F[/chat - Interview conversation]
        E --> G[/report/detailed - Generate report]
        E --> H[/history - Save/Get history]
        E --> I[/reset - Reset session]
        
        C --> J[User Endpoints]
        J --> K[/login - Authentication]
        J --> L[/register - Create account]
        J --> M[/settings - User preferences]
        
        F --> N[ChatBot Service]
        G --> N
        H --> N
        
        N --> O[Pinecone Service]
        N --> P[Email Service]
        N --> Q[TTS Service]
        
        O --> R[Mistral AI Integration]
        O --> S[Pinecone Vector DB]
        
        N --> T[MongoDB Operations]
        T --> U[User Collection]
        T --> V[KnowledgeBot Collection]
        T --> W[ChatTranscript Collection]
        T --> X[InterviewArtifacts Collection]
        T --> Y[UserSettings Collection]
    end
    
    style A fill:#FF6B35,stroke:#000,color:#fff
    style O fill:#4ECDC4,stroke:#000,color:#000
    style N fill:#95E1D3,stroke:#000,color:#000
```

---

## 🗄️ Database Schema

```mermaid
erDiagram
    USER ||--o{ KNOWLEDGE_BOT : creates
    USER ||--o{ CHAT_TRANSCRIPT : has
    USER ||--o{ INTERVIEW_ARTIFACTS : generates
    USER ||--|| USER_SETTINGS : has
    
    KNOWLEDGE_BOT ||--o{ CHAT_TRANSCRIPT : contains
    KNOWLEDGE_BOT ||--o{ INTERVIEW_ARTIFACTS : produces
    
    USER {
        ObjectId _id PK
        string email UK
        string password
        string name
        int phone_number
        string company_name
        datetime created_at
    }
    
    USER_SETTINGS {
        ObjectId _id PK
        ObjectId user_id FK
        string theme
        string voice
    }
    
    KNOWLEDGE_BOT {
        ObjectId _id PK
        ObjectId user_id FK
        string namespace_id UK
        string bot_name
        string description
        datetime created_at
    }
    
    CHAT_TRANSCRIPT {
        ObjectId _id PK
        ObjectId user_id FK
        string namespace_id FK
        string messages_json
        string pdf_path
        datetime created_at
    }
    
    INTERVIEW_ARTIFACTS {
        ObjectId _id PK
        ObjectId user_id FK
        string namespace_id FK
        string session_name
        string topic
        string transcript_pdf_path
        string detailed_report_pdf_path
        string summary_audio_path
        string summary_text
        string total_score
        datetime sent_to_email
        datetime created_at
    }
```

---

## 🔌 API Endpoints

### User Management

```mermaid
graph LR
    A[User APIs] --> B[POST /user/register]
    A --> C[POST /user/login]
    A --> D[GET /user/settings]
    A --> E[POST /user/settings]
    
    B -.->|Creates| F[User Account]
    C -.->|Returns| G[JWT Token]
    D -.->|Returns| H[User Preferences]
    E -.->|Updates| H
```

### ChatBot/Interview Management

```mermaid
graph LR
    A[ChatBot APIs] --> B[POST /chat-bot]
    A --> C[GET /chat-bot/all]
    A --> D[POST /chat-bot/chat]
    A --> E[POST /chat-bot/reset]
    A --> F[POST /chat-bot/history]
    A --> G[GET /chat-bot/history]
    A --> H[POST /chat-bot/history/pdf]
    A --> I[POST /chat-bot/report/detailed]
    
    B -.->|Creates| J[Interview Session]
    C -.->|Lists| J
    D -.->|Handles| K[Q&A Interaction]
    E -.->|Resets| L[Session State]
    F -.->|Saves| M[Chat History]
    G -.->|Retrieves| M
    H -.->|Generates| N[Transcript PDF]
    I -.->|Generates| O[Detailed Report + Email]
```

---

## 🎯 Key Features Architecture

### 1. Dynamic Question Generation

```mermaid
flowchart TD
    A[User selects topic] --> B{Topic recognized?}
    B -->|Yes| C[Generate questions via LLM]
    B -->|No - Custom| C
    C --> D[LLM generates 10 questions]
    D --> E[Store in session_questions]
    E --> F[Ask first question]
    F --> G[User answers]
    G --> H[Evaluate answer]
    H --> I{Score answer}
    I --> J[Update total score]
    I --> K[Store question score]
    J --> L{More questions?}
    L -->|Yes| F
    L -->|No| M[Generate summary]
    M --> N[Display comprehensive summary]
```

### 2. Email Delivery System

```mermaid
flowchart TD
    A[Report generation triggered] --> B[Generate Transcript PDF]
    A --> C[Generate Detailed Report PDF]
    A --> D[Generate TTS Audio]
    
    B --> E{PDF exists?}
    E -->|No| F[Create new PDF]
    E -->|Yes| G[Use existing]
    F --> G
    
    C --> H[Create report with scores]
    
    D --> I{Summary available?}
    I -->|Yes| J[Clean markdown from text]
    I -->|No| K[Skip audio]
    J --> L[Generate MP3 via TTS]
    L --> M[Save audio file]
    
    G --> N[Collect all files]
    H --> N
    M --> N
    K --> N
    
    N --> O[Get user email from DB]
    O --> P[Create email with attachments]
    P --> Q[Send via SMTP]
    Q --> R[Update sent_to_email timestamp]
    R --> S[Return PDF to user]
```

### 3. Text-to-Speech Processing

```mermaid
flowchart TD
    A[Interview summary generated] --> B[Clean text for TTS]
    B --> C[Remove markdown formatting]
    C --> D[Remove code blocks]
    D --> E[Remove special symbols]
    E --> F{Primary: pyttsx3}
    F -->|Success| G[Use system voice]
    F -->|Fail| H[Fallback: gTTS]
    G --> I{Voice preference?}
    I -->|Male| J[Select male voice]
    I -->|Female| K[Select female voice]
    J --> L[Generate audio]
    K --> L
    H --> L
    L --> M[Save as MP3]
    M --> N[Return file path]
```

---

## 🔐 Security Architecture

```mermaid
flowchart TD
    A[User Request] --> B{Has JWT Token?}
    B -->|No| C[Reject - 401 Unauthorized]
    B -->|Yes| D[Extract token from header]
    D --> E[Verify JWT signature]
    E --> F{Valid token?}
    F -->|No| C
    F -->|Yes| G[Extract user_id from payload]
    G --> H[Add to request.state.user]
    H --> I[Process request]
    I --> J{Access user's data only}
    J --> K[Return response]
    
    style C fill:#FF6B6B,stroke:#000,color:#fff
    style K fill:#51CF66,stroke:#000,color:#fff
```

---

## 📁 File Structure

```
JavaSherpa/
├── frontend/                    # React application
│   ├── src/
│   │   ├── pages/              # Page components
│   │   │   ├── home/           # Landing page
│   │   │   ├── auth/           # Login/Register
│   │   │   └── default/        # Main interview interface
│   │   ├── components/         # Reusable components
│   │   ├── services/           # API calls
│   │   ├── router/             # Route management
│   │   └── utils/              # Helper functions
│   └── package.json
│
├── routers/                     # FastAPI route handlers
│   ├── user.py                 # User authentication routes
│   └── chat_bot.py             # Interview/chat routes
│
├── services/                    # Business logic
│   ├── user_service.py         # User operations
│   ├── chat_bot_service.py     # Interview management
│   └── pinecone_service.py     # LLM & vector operations
│
├── utils/                       # Utility functions
│   ├── email_service.py        # Email delivery
│   ├── tts_service.py          # Text-to-speech
│   ├── jwt.py                  # JWT handling
│   └── helper.py               # General helpers
│
├── models/                      # Data models
│   ├── dto.py                  # Pydantic request/response models
│   └── schemas.py              # MongoDB schemas
│
├── config/                      # Configuration
│   ├── constants.py            # App constants
│   └── mongodb.py              # DB connection
│
├── upload/                      # Generated files (gitignored)
│   └── {namespace_id}/
│       ├── transcripts/        # Conversation PDFs
│       └── reports/            # Detailed reports & audio
│
├── app.py                       # FastAPI main app
├── requirements.txt             # Python dependencies
└── .env                         # Environment variables (gitignored)
```

---

## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        A[Load Balancer] --> B[Frontend Server - Nginx]
        A --> C[Backend Server - Uvicorn]
        
        B --> D[React Static Files]
        
        C --> E[FastAPI Application]
        E --> F[Worker Processes]
        
        E --> G[(MongoDB Atlas)]
        E --> H[(Pinecone Cloud)]
        E --> I[Mistral AI API]
        E --> J[Gmail SMTP]
        
        E --> K[File Storage]
        K --> L[PDF Files]
        K --> M[Audio Files]
    end
    
    subgraph "External Services"
        G
        H
        I
        J
    end
    
    style A fill:#4CAF50,stroke:#000,color:#fff
    style B fill:#2196F3,stroke:#000,color:#fff
    style C fill:#FF9800,stroke:#000,color:#fff
```

---

## 📊 Performance Considerations

### Caching Strategy
- Session data cached in Pinecone Service (in-memory)
- JWT tokens cached in frontend localStorage
- Vector search results cached temporarily

### Optimization Points
- Streaming responses for LLM interactions
- Lazy loading of chat history
- Compressed PDF generation
- Background email sending
- Efficient vector search in Pinecone

### Scalability
- Stateless backend (can scale horizontally)
- MongoDB for persistent storage
- Pinecone for vector operations
- File storage can be moved to S3/Cloud Storage

---

## 🔄 Key Interactions Summary

| Component | Interacts With | Purpose |
|-----------|----------------|---------|
| **Frontend** | Backend API | All user requests |
| **Backend** | MongoDB | User data, sessions, transcripts |
| **Backend** | Pinecone | Vector search, embeddings |
| **Backend** | Mistral AI | Question generation, evaluation, summaries |
| **Backend** | Gmail SMTP | Email delivery |
| **Backend** | File System | PDF & audio storage |
| **Pinecone Service** | All of above | Orchestrates LLM operations |

---

This architecture provides a scalable, maintainable, and feature-rich interview preparation system! 🚀
