# HR Chatbot Backend

A FastAPI-based backend for an HR chatbot with OpenAI integration, vector search knowledge base, and user authentication.

## Features

- User authentication with JWT tokens
- Chat API with conversation history
- Knowledge base with vector search (FAISS)
- OpenAI integration for natural language processing

## Prerequisites

- Python 3.8+
- OpenAI API key

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/hr-chatbot.git
cd hr-chatbot/backend
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory with the following content:

```
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# JWT Authentication
SECRET_KEY=your_secret_key_for_jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database settings
DATABASE_URL=sqlite:///./hr_chatbot.db

# CORS settings
FRONTEND_URL=http://localhost:3000
```

## Running the server

```bash
python run.py
```

The server will start at http://localhost:8000

## API Documentation

Once the server is running, you can access the API documentation at:

- http://localhost:8000/docs (Swagger UI)
- http://localhost:8000/redoc (ReDoc)

## API Endpoints

### Authentication

- `POST /api/auth/token` - Get JWT token
- `POST /api/auth/register` - Register a new user
- `GET /api/auth/me` - Get current user info

### Chat

- `POST /api/chat/` - Send a message and get a response
- `GET /api/chat/sessions` - Get all chat sessions
- `GET /api/chat/sessions/{session_id}` - Get a specific chat session

### Knowledge Base

- `POST /api/knowledge/documents` - Add a document to the knowledge base
- `GET /api/knowledge/search` - Search for documents

## Project Structure

```
backend/
├── app/
│   ├── db/
│   │   ├── database.py
│   │   └── init_db.py
│   ├── models/
│   │   ├── user.py
│   │   └── chat.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── chat.py
│   │   └── knowledge.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── chat_service.py
│   │   └── knowledge_service.py
│   └── utils/
│       ├── auth_utils.py
│       ├── openai_utils.py
│       └── vector_store.py
├── .env
├── main.py
├── requirements.txt
└── run.py
```
