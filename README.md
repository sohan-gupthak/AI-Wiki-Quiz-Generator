# AI Wiki Quiz Generator

A full-stack web application that transforms Wikipedia articles into comprehensive educational quizzes using AI. The system scrapes Wikipedia content, generates structured quizzes with multiple-choice questions using Google's Gemini API via LangChain, and maintains a complete history of all generated quizzes with detailed metadata.

## Table of Contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Usage Guide](#usage-guide)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)

## Screenshots

![ai-wiki-quiz-generator_48_6s](https://github.com/user-attachments/assets/f3c24768-fb8f-496f-8faf-1fde03d1d378)

![ai-wiki-quiz-generator_111_7s](https://github.com/user-attachments/assets/408b8581-cd2e-4cc3-9df6-8c5e6c416d5d)

![ai-wiki-quiz-generator_138_5s](https://github.com/user-attachments/assets/2fe4fdd1-fdb1-4133-a44a-683fc4c6bc4e)


## Features

### Core Functionality
- **Wikipedia Article Scraping**: Extracts and cleans content from any Wikipedia article URL
- **AI-Powered Quiz Generation**: Creates 5-10 multiple-choice questions with explanations using Gemini API
- **Comprehensive Metadata**: Extracts key entities (people, organizations, locations), article sections, and related topics
- **Quiz History**: Stores all generated quizzes in PostgreSQL database with full metadata
- **Interactive UI**: Clean React interface with tab-based navigation and modal displays

### Quiz Features
- Multiple-choice questions (4 options each)
- Difficulty levels (easy, medium, hard)
- Detailed explanations for each answer
- Article summary and key entities
- Related topics for further reading
- Section-wise organization

## Technology Stack

### Backend
- **Python 3.10+**: Core programming language
- **FastAPI**: Modern web framework for building APIs
- **Uvicorn**: ASGI server for production deployment
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL**: Relational database for quiz storage
- **Pydantic**: Data validation and serialization
- **LangChain**: Framework for LLM integration
- **Google Gemini API**: AI model for quiz generation
- **BeautifulSoup4**: HTML parsing and content extraction
- **Requests**: HTTP library for web scraping

### Frontend
- **React 18+**: UI library with functional components and hooks
- **Vite**: Build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **JavaScript (ES6+)**: Core programming language

## Project Structure

```
ai-wiki-quiz-generator/
├── backend/                      # Python FastAPI backend
│   ├── venv/                    # Python virtual environment
│   ├── main.py                  # FastAPI application and endpoints
│   ├── database.py              # SQLAlchemy models and database setup
│   ├── models.py                # Pydantic schemas for validation
│   ├── scraper.py               # Wikipedia scraping logic
│   ├── llm_quiz_generator.py   # LangChain LLM integration
│   ├── init_db.py               # Database initialization script
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # Environment variables (not in git)
│   └── .env.example             # Example environment configuration
│
├── frontend/                     # React frontend application
│   ├── src/
│   │   ├── components/          # Reusable React components
│   │   │   ├── QuizDisplay.jsx  # Quiz rendering component
│   │   │   ├── Modal.jsx        # Modal wrapper component
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── ErrorMessage.jsx
│   │   ├── tabs/                # Tab components
│   │   │   ├── GenerateQuizTab.jsx
│   │   │   └── HistoryTab.jsx
│   │   ├── services/
│   │   │   └── api.js           # API communication layer
│   │   ├── App.jsx              # Main application component
│   │   └── main.jsx             # Application entry point
│   ├── public/                  # Static assets
│   ├── index.html               # HTML template
│   ├── package.json             # Node dependencies
│   ├── vite.config.js           # Vite configuration
│   ├── tailwind.config.js       # Tailwind CSS configuration
│   ├── .env                     # Environment variables (not in git)
│   └── .env.example             # Example environment configuration
│
├── sample_data/                  # Test data and test runners
│   ├── test_urls.json           # Sample Wikipedia URLs for testing
│   ├── run_sample_tests.js      # Automated test runner
│   └── README.md                # Testing documentation
│
└── README.md                     # This file
```

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
- **Python 3.10 or higher**: [Download Python](https://www.python.org/downloads/)
- **Node.js 16+ and npm**: [Download Node.js](https://nodejs.org/)
- **PostgreSQL 12+**: [Download PostgreSQL](https://www.postgresql.org/download/)
- **Git**: [Download Git](https://git-scm.com/downloads)

### Required API Keys
- **Google Gemini API Key**: Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### System Requirements
- **Operating System**: Windows, macOS, or Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: At least 500MB free space

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/sohan-gupthak/AI-Wiki-Quiz-Generator.git
cd ai-wiki-quiz-generator
```

### 2. Database Setup

#### Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE quiz_generator;

# Create user (optional)
CREATE USER quiz_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE quiz_generator TO quiz_user;

# Exit psql
\q
```

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
copy .env.example .env  # Windows
cp .env.example .env    # macOS/Linux

# Edit .env file with your configuration
# - Set DATABASE_URL with your PostgreSQL credentials
# - Set GOOGLE_API_KEY with your Gemini API key
```

#### Backend Environment Variables

Edit `backend/.env` with your configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/quiz_generator

# LLM Configuration
GOOGLE_API_KEY=your_gemini_api_key_here

# Application Configuration
DEBUG=True
LOG_LEVEL=INFO
```

#### Initialize Database

```bash
# Run database initialization script
python init_db.py
```

### 4. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Create .env file from example
copy .env.example .env  # Windows
cp .env.example .env    # macOS/Linux

# Edit .env file if needed (default should work for local development)
```

#### Frontend Environment Variables

Edit `frontend/.env` if needed:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
```

## Configuration

### Backend Configuration

The backend uses environment variables for configuration. All settings are in `backend/.env`:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `GOOGLE_API_KEY` | Gemini API key for quiz generation | - | Yes |
| `DEBUG` | Enable debug mode | `True` | No |
| `LOG_LEVEL` | Logging level (INFO, DEBUG, WARNING, ERROR) | `INFO` | No |

### Frontend Configuration

The frontend uses Vite environment variables in `frontend/.env`:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000` | Yes |

### Database Configuration

The application uses PostgreSQL with the following schema:

```sql
CREATE TABLE quiz (
    id SERIAL PRIMARY KEY,
    url VARCHAR(500) NOT NULL,
    title VARCHAR(200) NOT NULL,
    date_generated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scraped_content TEXT,
    full_quiz_data TEXT NOT NULL
);
```

## Running the Application

### Development Mode

#### Start Backend Server

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Run FastAPI server with auto-reload
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at:
- **API**: http://localhost:8000
- **Interactive API Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

#### Start Frontend Development Server

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend

# Start Vite development server
npm run dev
```

The frontend will be available at:
- **Application**: http://localhost:5173

### Production Mode

#### Backend Production

```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Run with production settings
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

#### Frontend Production

```bash
cd frontend

# Build for production
npm run build

# Preview production build
npm run preview

# Or serve with a static file server
npx serve -s dist
```

## API Documentation

### Base URL

```
http://localhost:8000
```

### Endpoints

#### 1. Health Check

Check API and database health status.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "database_connected": true
}
```

**Status Codes**:
- `200 OK`: Service is healthy

---

#### 2. Generate Quiz

Generate a comprehensive quiz from a Wikipedia article URL.

**Endpoint**: `POST /generate_quiz`

**Request Body**:
```json
{
  "url": "https://en.wikipedia.org/wiki/Python_(programming_language)"
}
```

**Response**:
```json
{
  "id": 1,
  "url": "https://en.wikipedia.org/wiki/Python_(programming_language)",
  "title": "Python (programming language)",
  "summary": "Python is a high-level, interpreted programming language known for its simplicity and readability...",
  "key_entities": {
    "people": ["Guido van Rossum", "Barry Warsaw"],
    "organizations": ["Python Software Foundation", "Google", "Dropbox"],
    "locations": ["Netherlands", "United States"]
  },
  "sections": [
    "History",
    "Design philosophy",
    "Syntax and semantics",
    "Libraries",
    "Development"
  ],
  "quiz": [
    {
      "question": "Who created the Python programming language?",
      "options": [
        "Guido van Rossum",
        "James Gosling",
        "Bjarne Stroustrup",
        "Dennis Ritchie"
      ],
      "answer": "Guido van Rossum",
      "difficulty": "easy",
      "explanation": "Guido van Rossum created Python in the late 1980s, as mentioned in the History section."
    }
  ],
  "related_topics": [
    "Programming language",
    "Interpreted language",
    "Object-oriented programming",
    "Dynamic typing",
    "Software development"
  ]
}
```

**Status Codes**:
- `200 OK`: Quiz generated successfully
- `400 Bad Request`: Invalid Wikipedia URL format
- `404 Not Found`: Article not found or empty
- `503 Service Unavailable`: Failed to access Wikipedia or LLM service
- `500 Internal Server Error`: Unexpected error

**Error Response**:
```json
{
  "error": "HTTP 400",
  "message": "Invalid Wikipedia URL format. Please provide a valid English Wikipedia article URL.",
  "details": null
}
```

---

#### 3. Get Quiz History

Retrieve a list of all generated quizzes with pagination.

**Endpoint**: `GET /history`

**Query Parameters**:
- `skip` (optional): Number of records to skip (default: 0)
- `limit` (optional): Maximum records to return (default: 100, max: 100)

**Example Request**:
```
GET /history?skip=0&limit=10
```

**Response**:
```json
[
  {
    "id": 3,
    "url": "https://en.wikipedia.org/wiki/Artificial_intelligence",
    "title": "Artificial intelligence",
    "date_generated": "2024-01-15T14:30:00"
  },
  {
    "id": 2,
    "url": "https://en.wikipedia.org/wiki/Machine_learning",
    "title": "Machine learning",
    "date_generated": "2024-01-15T14:25:00"
  },
  {
    "id": 1,
    "url": "https://en.wikipedia.org/wiki/Python_(programming_language)",
    "title": "Python (programming language)",
    "date_generated": "2024-01-15T14:20:00"
  }
]
```

**Status Codes**:
- `200 OK`: History retrieved successfully
- `400 Bad Request`: Invalid pagination parameters
- `500 Internal Server Error`: Database error

---

#### 4. Get Quiz by ID

Retrieve a specific quiz with all details by its database ID.

**Endpoint**: `GET /quiz/{quiz_id}`

**Path Parameters**:
- `quiz_id`: Integer ID of the quiz

**Example Request**:
```
GET /quiz/1
```

**Response**:
```json
{
  "id": 1,
  "url": "https://en.wikipedia.org/wiki/Python_(programming_language)",
  "title": "Python (programming language)",
  "summary": "Python is a high-level, interpreted programming language...",
  "key_entities": {
    "people": ["Guido van Rossum"],
    "organizations": ["Python Software Foundation"],
    "locations": ["Netherlands"]
  },
  "sections": ["History", "Design philosophy", "Syntax"],
  "quiz": [
    {
      "question": "Who created Python?",
      "options": ["Guido van Rossum", "James Gosling", "Dennis Ritchie", "Linus Torvalds"],
      "answer": "Guido van Rossum",
      "difficulty": "easy",
      "explanation": "Guido van Rossum created Python in the late 1980s."
    }
  ],
  "related_topics": ["Programming language", "Software development"]
}
```

**Status Codes**:
- `200 OK`: Quiz retrieved successfully
- `400 Bad Request`: Invalid quiz ID
- `404 Not Found`: Quiz not found
- `500 Internal Server Error`: Database or deserialization error

---

#### 5. API Information

Get information about available endpoints.

**Endpoint**: `GET /api/info`

**Response**:
```json
{
  "name": "AI Wiki Quiz Generator API",
  "version": "1.0.0",
  "description": "Transform Wikipedia articles into comprehensive educational quizzes using AI",
  "endpoints": {
    "POST /generate_quiz": "Generate a quiz from a Wikipedia URL",
    "GET /history": "Get quiz history with pagination",
    "GET /quiz/{quiz_id}": "Get a specific quiz by ID",
    "GET /health": "Health check endpoint",
    "GET /api/info": "API information"
  },
  "documentation": {
    "swagger": "/docs",
    "redoc": "/redoc"
  }
}
```

### Interactive API Documentation

FastAPI provides interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

These interfaces allow you to:
- View all endpoints and their parameters
- Test API calls directly from the browser
- See request/response schemas
- View example requests and responses

## Testing

### Automated Testing

The project includes automated test scripts for comprehensive testing.

#### Run Sample Tests

```bash
# From project root directory
node sample_data/run_sample_tests.js
```

This will:
1. Test quiz generation with 8 different Wikipedia articles
2. Validate quiz structure and content
3. Test error handling with invalid URLs
4. Save generated quizzes to `sample_data/generated_quizzes/`
5. Display detailed test results

**Test Duration**: Approximately 2-5 minutes (depending on LLM API response time)

#### Test Cases Included

The automated tests cover:
- **Short articles** (e.g., Haiku)
- **Medium articles** (e.g., Python programming language)
- **Long articles** (e.g., World War II)
- **Scientific articles** (e.g., Photosynthesis)
- **Biographical articles** (e.g., Albert Einstein)
- **Historical events** (e.g., Moon landing)
- **Geographical articles** (e.g., Mount Everest)
- **Technology articles** (e.g., Artificial Intelligence)
- **Error cases** (invalid URLs, non-existent articles)

### Manual Testing

#### Test Quiz Generation

```bash
# Using curl
curl -X POST http://localhost:8000/generate_quiz \
  -H "Content-Type: application/json" \
  -d '{"url": "https://en.wikipedia.org/wiki/Python_(programming_language)"}'
```

#### Test History Endpoint

```bash
curl http://localhost:8000/history
```

#### Test Get Quiz by ID

```bash
curl http://localhost:8000/quiz/1
```

#### Test Health Check

```bash
curl http://localhost:8000/health
```

### Frontend Testing

1. Start both backend and frontend servers
2. Open http://localhost:5173 in your browser
3. Test the following workflows:

**Generate Quiz Tab**:
- Enter a valid Wikipedia URL
- Click "Generate Quiz"
- Verify quiz displays with all sections
- Test with invalid URLs to verify error handling

**History Tab**:
- View list of generated quizzes
- Click "Details" on any quiz
- Verify modal displays complete quiz data
- Test with empty history

### Test Data

Sample test URLs are provided in `sample_data/test_urls.json`. You can add more test cases by editing this file.

For detailed testing documentation, see `sample_data/README.md`.

## Usage Guide

### Generating a Quiz

1. **Start the Application**
   - Ensure both backend and frontend servers are running
   - Open http://localhost:5173 in your browser

2. **Enter Wikipedia URL**
   - Navigate to the "Generate Quiz" tab
   - Enter a valid English Wikipedia article URL
   - Example: `https://en.wikipedia.org/wiki/Machine_learning`

3. **Generate Quiz**
   - Click the "Generate Quiz" button
   - Wait for the quiz to be generated (typically 5-15 seconds)
   - The quiz will display with all sections

4. **Review Quiz Content**
   - **Title & Summary**: Article overview
   - **Key Entities**: Important people, organizations, and locations
   - **Sections**: Main topics covered in the article
   - **Quiz Questions**: 5-10 multiple-choice questions with explanations
   - **Related Topics**: Suggestions for further reading

### Viewing Quiz History

1. **Navigate to History Tab**
   - Click on the "Past Quizzes" tab

2. **Browse Generated Quizzes**
   - View table with ID, URL, title, and generation date
   - Quizzes are sorted by date (newest first)

3. **View Quiz Details**
   - Click "Details" button on any quiz
   - Modal opens with complete quiz data
   - Review questions, answers, and metadata

### Using the API Directly

You can integrate the API into your own applications:

```javascript
// Generate a quiz
const response = await fetch('http://localhost:8000/generate_quiz', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://en.wikipedia.org/wiki/Artificial_intelligence'
  })
});
const quiz = await response.json();

// Get quiz history
const history = await fetch('http://localhost:8000/history');
const quizzes = await history.json();

// Get specific quiz
const quizDetail = await fetch('http://localhost:8000/quiz/1');
const quizData = await quizDetail.json();
```

## Troubleshooting

### Common Issues

#### Backend Issues

**Issue**: `ModuleNotFoundError: No module named 'fastapi'`
- **Solution**: Ensure virtual environment is activated and dependencies are installed
  ```bash
  cd backend
  venv\Scripts\activate  # Windows
  pip install -r requirements.txt
  ```

**Issue**: `sqlalchemy.exc.OperationalError: could not connect to server`
- **Solution**: Ensure PostgreSQL is running and DATABASE_URL is correct
  ```bash
  # Check PostgreSQL status
  # Windows: Check Services
  # macOS: brew services list
  # Linux: sudo systemctl status postgresql
  ```

**Issue**: `google.api_core.exceptions.PermissionDenied: API key not valid`
- **Solution**: Verify your Gemini API key in `backend/.env`
  - Get a new key from [Google AI Studio](https://makersuite.google.com/app/apikey)
  - Ensure no extra spaces or quotes in the .env file

**Issue**: `Quiz generation fails with timeout`
- **Solution**: The LLM API may be slow or rate-limited
  - Wait a few moments and try again
  - Check your API quota at Google AI Studio
  - Try with a shorter Wikipedia article

#### Frontend Issues

**Issue**: `Failed to fetch` or CORS errors
- **Solution**: Ensure backend is running and CORS is configured
  - Check backend is running at http://localhost:8000
  - Verify `VITE_API_BASE_URL` in `frontend/.env`
  - Check browser console for specific error messages

**Issue**: `npm install` fails
- **Solution**: Clear npm cache and retry
  ```bash
  npm cache clean --force
  rm -rf node_modules package-lock.json
  npm install
  ```

**Issue**: Frontend shows blank page
- **Solution**: Check browser console for errors
  - Ensure all dependencies are installed
  - Try clearing browser cache
  - Restart the Vite development server

#### Database Issues

**Issue**: `relation "quiz" does not exist`
- **Solution**: Initialize the database
  ```bash
  cd backend
  python init_db.py
  ```

**Issue**: Database connection refused
- **Solution**: Ensure PostgreSQL is running and credentials are correct
  - Verify DATABASE_URL in `backend/.env`
  - Test connection: `psql -U username -d quiz_generator`

### Getting Help

If you encounter issues not covered here:

1. **Check Logs**
   - Backend logs: Check terminal where backend is running
   - Frontend logs: Check browser console (F12)

2. **Verify Configuration**
   - Ensure all environment variables are set correctly
   - Check that all services (PostgreSQL, backend, frontend) are running

3. **Test Individual Components**
   - Test database connection separately
   - Test API endpoints with curl or Postman
   - Test frontend with mock data

4. **Review Documentation**
   - FastAPI docs: http://localhost:8000/docs
   - Sample data README: `sample_data/README.md`
   - Testing guide: `TESTING_GUIDE.md`

## Architecture

### System Architecture

The application follows a three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  React UI (Vite) + Tailwind CSS + API Service Layer        │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/REST API
┌─────────────────────▼───────────────────────────────────────┐
│                       Backend Layer                          │
│  FastAPI + SQLAlchemy + LangChain + BeautifulSoup          │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐               │
│  │ Scraper  │  │   LLM    │  │  Database  │               │
│  │  Module  │  │  Service │  │  Service   │               │
│  └──────────┘  └──────────┘  └────────────┘               │
└─────────────────────┬───────────────┬───────────────────────┘
                      │               │
         ┌────────────▼─────┐    ┌───▼──────────┐
         │   Wikipedia      │    │  PostgreSQL  │
         │   (External)     │    │   Database   │
         └──────────────────┘    └──────────────┘
                      │
         ┌────────────▼─────┐
         │   Gemini API     │
         │   (External)     │
         └──────────────────┘
```

### Data Flow

1. **User Input**: User enters Wikipedia URL in React frontend
2. **API Request**: Frontend sends POST request to `/generate_quiz`
3. **URL Validation**: Backend validates Wikipedia URL format
4. **Content Scraping**: BeautifulSoup extracts and cleans article content
5. **Quiz Generation**: LangChain sends content to Gemini API for quiz generation
6. **Data Storage**: Complete quiz data stored in PostgreSQL
7. **Response**: Structured quiz data returned to frontend
8. **Display**: React components render quiz with all metadata

### Key Components

- **Frontend**: React SPA with tab-based navigation
- **API Layer**: FastAPI with RESTful endpoints
- **Scraper**: BeautifulSoup-based Wikipedia content extractor
- **LLM Service**: LangChain integration with Gemini API
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Validation**: Pydantic schemas for data validation

### Security Considerations

- Input validation for Wikipedia URLs
- SQL injection prevention through ORM
- XSS prevention in frontend rendering
- API key protection through environment variables
- CORS configuration for cross-origin requests
- Request size limits to prevent memory issues


## Acknowledgments

- **Google Gemini API**: AI-powered quiz generation
- **Wikipedia**: Source of educational content
- **FastAPI**: Modern Python web framework
- **React**: UI library for building interactive interfaces
- **LangChain**: Framework for LLM integration
