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

### Backend (.env)
Copy `.env.example` to `.env` and fill in your values:
```
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_API_KEY=your_supabase_api_key_here

# JWT Configuration
JWT_SECRET_KEY=your_jwt_secret_key_here

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
```

### Frontend (.env)
Create a `.env` file in the frontend directory:
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_SUPABASE_URL=https://sethhceiojxrevvpzupf.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNldGhoY2Vpb2p4cmV2dnB6dXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NDcyMDAsImV4cCI6MjA1ODEyMzIwMH0.dYLDhmxgP9k-fOAGAddH8UNCETMF8fHKNhSPWpDNisM
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
cp .env.example .env     # Copy example env file
# Edit .env with your credentials
```

3. Set up the frontend:
```bash
cd frontend
npm install
# Create .env file with your credentials
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

## Security Notes

1. Never commit `.env` files or any files containing sensitive information
2. Use environment variables for all sensitive data
3. Keep your API keys and secrets secure
4. Regularly rotate your JWT secrets and API keys
5. Monitor your API usage and set up appropriate rate limiting

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 