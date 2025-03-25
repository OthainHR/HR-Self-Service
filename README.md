# HR Chatbot

An intelligent HR chatbot application that helps employees get quick answers to their HR-related questions. The application uses OpenAI's GPT model for natural language processing and Supabase for data storage.

## Features

- Real-time chat interface
- Knowledge base management
- Role-based access control (Admin/User)
- Secure authentication
- Document search and retrieval
- File upload support

## Tech Stack

### Frontend
- React.js
- Material-UI
- Supabase Client
- Axios

### Backend
- FastAPI
- OpenAI API
- Supabase
- LangChain
- FAISS

## Prerequisites

- Node.js (v14 or higher)
- Python (v3.9 or higher)
- OpenAI API key
- Supabase account and credentials

## Environment Variables

### Backend
```
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET_KEY=your_jwt_secret
CORS_ORIGINS=http://localhost:3000
```

### Frontend
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/hr-chatbot.git
cd hr-chatbot
```

2. Set up the backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up the frontend:
```bash
cd frontend
npm install
```

## Running the Application

1. Start the backend server:
```bash
cd backend
uvicorn main:app --reload
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Deployment

The application is configured for deployment on:
- Frontend: Vercel
- Backend: Render

See the respective configuration files for deployment details:
- `frontend/vercel.json`
- `backend/render.yaml`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 