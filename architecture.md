# JavaSherpa - Architecture Diagrams (Portrait / Print Friendly)

## 1) System Overview (Vertical)
```mermaid
graph TD
U((User))
Browser[Web Browser]
React[React SPA Vite Routing UI]

Home[Home /]
About[About /about]
Login[Login /login]
Register[Register /register]
Protected[Protected /default]

Header[Header Layout /default]
BotList[BotList Create / List Sessions]
FileUpload[FileUpload Upload Materials]
ChatPage[ChatPage Voice STT/TTS, Markdown, Reports]
ClientCache[Browser localStorage cache]

U --> Browser --> React
React --> Home
React --> About
React --> Login
React --> Register
React --> Protected
Protected --> Header
Protected --> BotList
Protected --> FileUpload
Protected --> ChatPage
ChatPage --> ClientCache

API[FastAPI Server CORS and JWT]
UserRouter[User Router /user/*]
ChatBotRouter[ChatBot Router /chat-bot/*]
FilesRouter[Files Router /files/*]
Services[Services Orchestrator]
JWT[JWT Middleware]

API --> UserRouter
API --> ChatBotRouter
API --> FilesRouter
API --> JWT
API --> Services

React -->|"HTTP requests"| API

MongoDB[(MongoDB)]
UploadDir[Server Upload Directory PDF/MP3]

UserRouter --> MongoDB
ChatBotRouter --> MongoDB
FilesRouter --> MongoDB
FilesRouter --> UploadDir
ChatBotRouter --> UploadDir

Pinecone[Vector DB Pinecone]
Mistral[Mistral AI]
EmailSMTP[Email SMTP/Gmail]

ChatBotRouter --> Pinecone
ChatBotRouter --> Mistral
ChatBotRouter --> EmailSMTP

UserRouter -->|"forgot password OTP"| EmailSMTP
ChatPage -->|"POST chat-bot/chat streaming"| ChatBotRouter
ChatPage -->|"POST /history/pdf and /report/detailed"| ChatBotRouter
BotList -->|"POST chat-bot/"| ChatBotRouter
FileUpload -->|"POST files/fileUpload"| FilesRouter
```

## 2) Authentication + OTP Password Reset (Vertical)
```mermaid
graph TD
U((User))
Login[Login page]
Register[Register page]
API[FastAPI /user endpoints]
DB[(MongoDB)]
JWT[JWT token]

U --> Register
Register -->|"POST /user/register"| API
API --> DB
API -->|"success"| Login

U --> Login
Login -->|"POST /user/login"| API
API --> DB
API --> JWT
JWT -->|"Authorize"| U

U --> Login
Login -->|"POST /user/forgot-password OTP email"| API
API --> DB
API -->|"send OTP email"| U

U --> Login
Login -->|"POST /user/reset-password OTP and newPassword"| API
API --> DB
API -->|"Password updated"| U
```

## 3) Interview Session: Create → Upload → Chat → Report (Vertical)
```mermaid
graph TD
U((User))
Protected[Protected /default]
BotList[BotList sessions]
Upload[FileUpload PDF materials]
Chat[ChatPage streaming chat + voice]

API[FastAPI chat-bot + files routers]
Pinecone[Vector DB Pinecone]
Mistral[Mistral AI]
Mongo[(MongoDB)]
Artifacts[Upload dir + generated PDFs/MP3]

U --> Protected
Protected --> BotList
BotList -->|"POST chat-bot/"| API
BotList -->|"GET chat-bot/all"| API
API --> Mongo

Protected --> Upload
Upload -->|"GET files?chatBotId="| API
Upload -->|"POST files/fileUpload"| API
API --> Mongo
API --> Artifacts

Protected --> Chat
Chat -->|"POST chat-bot/chat streaming"| API
API --> Pinecone
API --> Mistral
API --> Mongo

Chat -->|"Save history"| API
Chat -->|"Reset"| API
Chat -->|"Download transcript PDF"| API
Chat -->|"Detailed report + email"| API
API --> Artifacts
```

## 4) Component Architecture (Vertical)
### Frontend Architecture
```mermaid
graph TD
  A[App.jsx - Root] --> B[MainRoute]
  B --> C[Public Routes]
  B --> D[Protected Routes]
  C --> E[Home Page /]
  C --> F[Auth Pages /login, /register]
  D --> G[Default Layout /default]
  G --> H[Header Layout]
  G --> I[BotList Component]
  G --> J[FileUpload Component]
  G --> K[ChatPage Component]
  K --> L[Message Display]
  K --> M[Input Controls]
  K --> N[TTS Controls]
  K --> O[Report Modal]
  K --> P[ReactMarkdown Renderer]
  P --> Q[Code Blocks + Syntax Rendering]
  B --> R[API Service Axios/fetch]
```

### Backend Architecture
```mermaid
graph TD
  A[FastAPI app app.py] --> B[Routers]
  B --> C[User Router /user/*]
  B --> D[ChatBot Router /chat-bot/*]
  B --> E[Files Router /files/*]
  B --> F[Auth and Middleware JWT/CORS]

  D --> G[Chat Endpoints /chat, /history, /report]
  C --> H[Auth Endpoints /login, /register, /settings]
  E --> I[File Endpoints upload, list, delete]

  G --> J[ChatBot Service LLM, vector, evaluation]
  H --> K[User Service CRUD, auth, preferences]
  I --> L[File Service metadata, storage orchestration]

  J --> M[Pinecone Vector Search]
  J --> N[Mistral AI Integration]
  J --> O[MongoDB Persistence]
  K --> O
  L --> O
```

## 5) Database Schema (ER Diagram)
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
    datetime created_at
  }

  CHAT_TRANSCRIPT {
    ObjectId _id PK
    ObjectId user_id FK
    string namespace_id FK
    string messages_json
    datetime created_at
  }

  INTERVIEW_ARTIFACTS {
    ObjectId _id PK
    ObjectId user_id FK
    string namespace_id FK
    string session_name
    string total_score
    datetime sent_to_email
    datetime created_at
  }
```

## 6) API Endpoints (Portrait-Friendly)
### User Management
```mermaid
graph TD
  A[User APIs] --> B[POST /user/register]
  A --> C[POST /user/login]
  A --> D[GET /user/settings]
  A --> E[POST /user/settings]

  B -.->|Creates account| F[User Account]
  C -.->|Returns token| G[JWT Token]
  D -.->|Returns preferences| H[User Preferences]
  E -.->|Updates preferences| H
```

### ChatBot / Interview Management
```mermaid
graph TD
  A[ChatBot APIs] --> B[POST /chat-bot/]
  A --> C[GET /chat-bot/all]
  A --> D[POST /chat-bot/chat]
  A --> E[POST /chat-bot/reset]
  A --> F[POST /chat-bot/history]
  A --> G[GET /chat-bot/history]
  A --> H[POST /chat-bot/history/pdf]
  A --> I[POST /chat-bot/report/detailed]

  B -.->|Creates session| J[Interview Session]
  C -.->|Lists sessions| J
  D -.->|Q&A interaction| K[Streaming Q&A]
  E -.->|Resets state| L[Session State]
  F -.->|Saves history| M[Chat History]
  G -.->|Retrieves history| M
  H -.->|Generates transcript PDF| N[Transcript PDF]
  I -.->|Generates report + email| O[Detailed Report]
```

## 7) Key Feature Flows (Portrait-Friendly)
### Dynamic Question Generation
```mermaid
flowchart TD
  A[User selects topic] --> B{Topic recognized?}
  B -->|Yes| C[Generate questions via LLM]
  B -->|No - Custom| C
  C --> D[LLM generates questions]
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

### Email Delivery System
```mermaid
flowchart TD
  A[Report generation triggered] --> B[Generate Transcript PDF]
  A --> C[Generate Detailed Report PDF]
  A --> D[Generate TTS Audio]
  B --> E{PDF exists?}
  E -->|No| F[Create new PDF]
  E -->|Yes| G[Use existing]
  C --> H[Create report with scores]
  D --> I{Summary available?}
  I -->|Yes| J[Clean markdown text]
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
  R --> S[Return PDFs / deliver to user]
```

### Text-to-Speech Processing
```mermaid
flowchart TD
  A[Interview summary generated] --> B[Clean text for TTS]
  B --> C[Remove markdown formatting]
  C --> D[Remove code blocks]
  D --> E[Remove special symbols]
  E --> F{TTS Engine}
  F -->|Success| G[Use system voice]
  F -->|Fail| H[Fallback TTS]
  G --> I{Voice preference?}
  I -->|Male| J[Select male voice]
  I -->|Female| K[Select female voice]
  J --> L[Generate audio]
  K --> L
  H --> L
  L --> M[Save as MP3]
  M --> N[Return file path]
```

## 8) Security Architecture (Portrait-Friendly)
```mermaid
flowchart TD
  A[User Request] --> B{Has JWT Token?}
  B -->|No| C[Reject - 401 Unauthorized]
  B -->|Yes| D[Extract token]
  D --> E[Verify JWT signature]
  E --> F{Valid token?}
  F -->|No| C
  F -->|Yes| G[Extract user_id from payload]
  G --> H[Attach user to request context]
  H --> I[Process request]
  I --> J{Access user's data only}
  J --> K[Return response]
```

## 9) Deployment Architecture (Portrait-Friendly)
```mermaid
graph TD
  LB[Load Balancer] --> NG[Nginx Frontend Static]
  LB --> UV[Uvicorn Backend]
  NG --> RS[React Static Files]
  UV --> API[FastAPI Application]
  API --> WK[Worker Processes]

  API --> MONG[(MongoDB Atlas)]
  API --> PINE[(Pinecone Cloud)]
  API --> MISTRAL[Mistral AI API]
  API --> GMAIL[SMTP Server Gmail]

  API --> STORE[File Storage]
  STORE --> PDF[PDF Files]
  STORE --> AUDIO[Audio Files]
```