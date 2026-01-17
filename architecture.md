graph TB
%% === STYLES ===
classDef core fill:#1E90FF,stroke:#000,color:#000,stroke-width:2px,rx:10px,ry:10px;
classDef db fill:#9ACD32,stroke:#000,color:#000,stroke-width:2px,rx:10px,ry:10px;
classDef external fill:#FFD700,stroke:#000,color:#000,stroke-width:2px,rx:10px,ry:10px;

%% === USERS ===
User(("User<br/>Web Interface"))

%% === FRONTEND LAYER ===
subgraph "Frontend Layer"
  Frontend["React SPA<br/>UI, Routing, State Management"]:::core
end

User -->|"interacts with"| Frontend

%% === BACKEND LAYER ===
subgraph "Backend Layer"
  API["FastAPI Server<br/>Business Logic, API Endpoints"]:::core
  UserService["User Service<br/>CRUD, Auth, Settings"]:::core
  ChatBotService["Chat Bot Service<br/>CRUD, Chat Logic"]:::core
  FileService["File Management Service<br/>Upload, Retrieve, Delete"]:::core
  PineconeService["Pinecone Service<br/>Vector Management, Similarity Search"]:::core
end

Frontend -->|"API calls"| API
API -->|"handles user requests"| UserService
API -->|"handles chat requests"| ChatBotService
API -->|"handles file requests"| FileService
ChatBotService -->|"uses"| PineconeService

%% === PERSISTENCE LAYER ===
subgraph "Persistence Layer"
  MongoDB["MongoDB<br/>User, Bot, Transcript Data"]:::db
end

UserService -->|"stores user data"| MongoDB
ChatBotService -->|"stores chat transcripts"| MongoDB
FileService -->|"stores file metadata"| MongoDB

%% === EXTERNAL SERVICES ===
subgraph "External Services"
  Pinecone["Pinecone<br/>Vector Similarity Search"]:::external
  MistralAI["MistralAI<br/>Embeddings, Chat Responses"]:::external
end

PineconeService -->|"interacts with"| Pinecone
ChatBotService -->|"uses"| MistralAI

%% === CONTROL & DATA FLOW ===
API -->|"initializes"| MongoDB
API -->|"uses JWT Middleware"| UserService
API -->|"uses CORS Middleware"| UserService
UserService -->|"validates user"| MongoDB
ChatBotService -->|"retrieves vectors"| PineconeService
ChatBotService -->|"sends chat prompts"| MistralAI

%% === FILE STORAGE ===
subgraph "File Storage"
  LocalStorage["Local File Storage<br/>Uploaded Files"]:::db
end

FileService -->|"stores files"| LocalStorage
FileService -->|"stores metadata"| MongoDB

%% === SUMMARY OF RELATIONSHIPS ===
API -->|"orchestrates"| UserService
API -->|"orchestrates"| ChatBotService
API -->|"orchestrates"| FileService
UserService -->|"depends on"| MongoDB
ChatBotService -->|"depends on"| PineconeService
FileService -->|"depends on"| MongoDB
FileService -->|"depends on"| LocalStorage