# HR Chatbot Frontend

A React-based frontend for the HR chatbot with Material UI components, JWT authentication, and responsive design.

## Features

- User authentication with JWT
- Chat interface with conversation history
- Knowledge base search and management (for HR admins)
- Responsive Material UI design

## Prerequisites

- Node.js 14+
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/hr-chatbot.git
cd hr-chatbot/frontend
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

## Running the Application

```bash
npm start
# or
yarn start
```

The application will start in development mode and open at http://localhost:3000

## Building for Production

```bash
npm run build
# or
yarn build
```

This will create a production-ready build in the `build` folder.

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── assets/
│   │   └── index.css
│   ├── components/
│   │   ├── ChatWindow.js
│   │   ├── MessageItem.js
│   │   └── NavBar.js
│   ├── context/
│   │   └── AuthContext.js
│   ├── pages/
│   │   ├── Chat.js
│   │   ├── Knowledge.js
│   │   └── Login.js
│   ├── services/
│   │   ├── api.js
│   │   └── auth.js
│   ├── App.js
│   └── index.js
├── package.json
└── README.md
```

## Connecting to the Backend

The frontend is configured to connect to the backend at http://localhost:8000. This is set up in the `package.json` file with the proxy setting. If you need to change this, update the proxy setting in the `package.json` file.

## Authentication

The application uses JWT tokens for authentication. Tokens are stored in the browser's localStorage and sent with each API request through an Axios interceptor.
