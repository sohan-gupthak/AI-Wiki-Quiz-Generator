# AI Wiki Quiz Generator

A full-stack web application that transforms Wikipedia articles into comprehensive educational quizzes using AI.

## Project Structure

```
├── backend/          # Python FastAPI backend
│   ├── venv/        # Python virtual environment
│   └── requirements.txt
├── frontend/        # React frontend with Vite
│   ├── src/
│   ├── public/
│   └── package.json
└── README.md
```

## Setup Instructions

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`
3. Install dependencies: `pip install -r requirements.txt`

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`

## Technology Stack

- **Backend**: Python, FastAPI, SQLAlchemy, PostgreSQL
- **Frontend**: React, Vite, Tailwind CSS
- **AI/ML**: LangChain, Gemini API
- **Web Scraping**: BeautifulSoup4, Requests