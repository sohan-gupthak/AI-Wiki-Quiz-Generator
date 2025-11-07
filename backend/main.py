"""
FastAPI main application for the AI Wiki Quiz Generator.

This module sets up the FastAPI application with CORS middleware,
error handling, logging, and all API endpoints for quiz generation
and history management.
"""

import logging
import traceback
from datetime import datetime
from typing import List, Optional, Dict
from collections import OrderedDict

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from database import get_database_session, init_database, Quiz
from models import (
    QuizRequest, QuizResponse, QuizSummary, ErrorResponse, 
    HealthResponse, ScrapedContent
)
from scraper import scrape_wikipedia_sync, is_valid_wikipedia_url
from llm_quiz_generator import generate_quiz_from_content
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Simple in-memory cache for quiz data (URL -> quiz_id mapping)
# Using OrderedDict for LRU-like behavior
QUIZ_CACHE_MAX_SIZE = 100
quiz_cache: OrderedDict[str, int] = OrderedDict()

def add_to_cache(url: str, quiz_id: int):
    """Add a quiz to the cache with LRU eviction."""
    if url in quiz_cache:
        # Move to end (most recently used)
        quiz_cache.move_to_end(url)
    else:
        quiz_cache[url] = quiz_id
        # Evict oldest if cache is full
        if len(quiz_cache) > QUIZ_CACHE_MAX_SIZE:
            quiz_cache.popitem(last=False)

def get_from_cache(url: str) -> Optional[int]:
    """Get quiz ID from cache if it exists."""
    if url in quiz_cache:
        # Move to end (most recently used)
        quiz_cache.move_to_end(url)
        return quiz_cache[url]
    return None

# Create FastAPI application
app = FastAPI(
    title="AI Wiki Quiz Generator API",
    description="Transform Wikipedia articles into comprehensive educational quizzes using AI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React development server
        "http://localhost:5173",  # Vite development server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*",  # Allow all origins for testing
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later.",
            "details": None
        }
    )


# HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    logger.warning(f"HTTP exception: {exc.status_code} - {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": f"HTTP {exc.status_code}",
            "message": exc.detail,
            "details": None
        }
    )


# Startup event
@app.on_event("startup")
async def startup_event():
    try:
        logger.info("Starting AI Wiki Quiz Generator API...")
        
        # Initialize database
        init_database()
        logger.info("Database initialized successfully")
        
        # Validate LLM setup
        from llm_quiz_generator import validate_llm_setup
        llm_validation = validate_llm_setup()
        
        if not llm_validation.get("api_key_configured"):
            logger.warning("Google API key not configured - quiz generation will fail")
        else:
            logger.info("LLM setup validated successfully")
        
        logger.info("API startup completed successfully")
        
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        raise


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down AI Wiki Quiz Generator API...")


@app.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_database_session)):
    try:
        # Test database connection
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        database_connected = True
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        database_connected = False
    
    return HealthResponse(
        status="healthy" if database_connected else "unhealthy",
        database_connected=database_connected
    )


# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "AI Wiki Quiz Generator API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


# Quiz generation endpoint
@app.post("/generate_quiz", response_model=QuizResponse)
async def generate_quiz(
    request: QuizRequest,
    db: Session = Depends(get_database_session)
):
    """
    Generate a comprehensive quiz from a Wikipedia article URL.
    
    This endpoint:
    1. Validates the Wikipedia URL
    2. Scrapes the article content
    3. Generates quiz using LLM
    4. Stores complete quiz data in database
    5. Returns structured quiz response
    
    Args:
        request (QuizRequest): Request containing Wikipedia URL
        db (Session): Database session
        
    Returns:
        QuizResponse: Complete quiz data with metadata
        
    Raises:
        HTTPException: For various error conditions
    """
    try:
        logger.info(f"Quiz generation requested for URL: {request.url}")
        
        # Step 1: Validate URL format
        if not is_valid_wikipedia_url(request.url):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Wikipedia URL format. Please provide a valid English Wikipedia article URL."
            )
        
        # Step 1.5: Check cache for existing quiz
        cached_quiz_id = get_from_cache(request.url)
        if cached_quiz_id:
            logger.info(f"Cache hit for URL: {request.url} (quiz_id: {cached_quiz_id})")
            try:
                # Retrieve cached quiz from database
                cached_quiz = db.query(Quiz).filter(Quiz.id == cached_quiz_id).first()
                if cached_quiz:
                    quiz_data = json.loads(cached_quiz.full_quiz_data)
                    quiz_response = QuizResponse(**quiz_data)
                    quiz_response.id = cached_quiz.id
                    logger.info(f"Returning cached quiz {cached_quiz_id}")
                    return quiz_response
                else:
                    # Cache entry is stale, remove it
                    logger.warning(f"Cached quiz {cached_quiz_id} not found in database, regenerating")
                    quiz_cache.pop(request.url, None)
            except Exception as e:
                logger.error(f"Error retrieving cached quiz: {str(e)}")
                # Continue to regenerate if cache retrieval fails
                quiz_cache.pop(request.url, None)
        
        # Step 2: Scrape Wikipedia content
        try:
            title, content = scrape_wikipedia_sync(request.url)
            
            if not title or not content:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Failed to extract content from Wikipedia article. The article may not exist or be inaccessible."
                )
            
            logger.info(f"Successfully scraped article: {title} ({len(content)} characters)")
            
        except ValueError as e:
            # URL validation or content extraction errors
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Article processing failed: {str(e)}"
            )
        except Exception as e:
            # Network or other scraping errors
            logger.error(f"Scraping error for {request.url}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to access Wikipedia. Please check the URL and try again later."
            )
        
        # Step 3: Generate quiz using LLM
        try:
            quiz_response = await generate_quiz_from_content(title, content, request.url)
            logger.info(f"Quiz generated successfully with {len(quiz_response.quiz)} questions")
            
        except ValueError as e:
            # Input validation errors
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quiz generation failed: {str(e)}"
            )
        except RuntimeError as e:
            # LLM generation errors
            logger.error(f"LLM generation error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Quiz generation service temporarily unavailable. Please try again later."
            )
        except Exception as e:
            # Unexpected LLM errors
            logger.error(f"Unexpected LLM error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred during quiz generation. Please try again."
            )
        
        # Step 4: Store quiz in database
        try:
            # Serialize quiz data to JSON
            quiz_data_json = quiz_response.json()
            
            # Create database record
            db_quiz = Quiz(
                url=request.url,
                title=title,
                date_generated=datetime.utcnow(),
                scraped_content=content,  # Store original content for reference
                full_quiz_data=quiz_data_json
            )
            
            db.add(db_quiz)
            db.commit()
            db.refresh(db_quiz)
            
            # Update response with database ID
            quiz_response.id = db_quiz.id
            
            # Add to cache
            add_to_cache(request.url, db_quiz.id)
            logger.info(f"Quiz stored in database with ID: {db_quiz.id} and added to cache")
            
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error storing quiz: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save quiz data. Please try again."
            )
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected database error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while saving the quiz. Please try again."
            )
        
        logger.info(f"Quiz generation completed successfully for: {title}")
        return quiz_response
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Catch any unexpected errors
        logger.error(f"Unexpected error in generate_quiz: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later."
        )


# Quiz history endpoint
@app.get("/history", response_model=List[QuizSummary])
async def get_quiz_history(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_database_session)
):
    """
    Retrieve quiz history with pagination support.
    
    Args:
        skip (int): Number of records to skip (for pagination)
        limit (int): Maximum number of records to return (max 100)
        db (Session): Database session
        
    Returns:
        List[QuizSummary]: List of quiz summaries
        
    Raises:
        HTTPException: For database errors
    """
    try:
        logger.info(f"Quiz history requested (skip={skip}, limit={limit})")
        
        # Validate pagination parameters
        if skip < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Skip parameter must be non-negative"
            )
        
        if limit <= 0 or limit > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Limit parameter must be between 1 and 100"
            )
        
        # Query database for quiz summaries
        try:
            quizzes = (
                db.query(Quiz)
                .order_by(Quiz.date_generated.desc())
                .offset(skip)
                .limit(limit)
                .all()
            )
            
            # Convert to response models
            quiz_summaries = [
                QuizSummary(
                    id=quiz.id,
                    url=quiz.url,
                    title=quiz.title,
                    date_generated=quiz.date_generated
                )
                for quiz in quizzes
            ]
            
            logger.info(f"Retrieved {len(quiz_summaries)} quiz summaries")
            return quiz_summaries
            
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving quiz history: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve quiz history. Please try again."
            )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_quiz_history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while retrieving quiz history."
        )


@app.get("/quiz/{quiz_id}", response_model=QuizResponse)
async def get_quiz_by_id(
    quiz_id: int,
    db: Session = Depends(get_database_session)
):
    """
    Retrieve a specific quiz by its database ID.
    
    Args:
        quiz_id (int): The database ID of the quiz to retrieve
        db (Session): Database session
        
    Returns:
        QuizResponse: Complete quiz data
        
    Raises:
        HTTPException: For invalid ID or database errors
    """
    try:
        logger.info(f"Quiz retrieval requested for ID: {quiz_id}")
        
        # Validate quiz ID
        if quiz_id <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quiz ID must be a positive integer"
            )
        
        try:
            quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
            
            if not quiz:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Quiz with ID {quiz_id} not found"
                )
            
            logger.info(f"Found quiz: {quiz.title}")
            
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving quiz {quiz_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve quiz from database. Please try again."
            )
        
        # Deserialize JSON data back to structured format
        try:
            quiz_data = json.loads(quiz.full_quiz_data)
            
            # Create QuizResponse object with validation
            quiz_response = QuizResponse(**quiz_data)
            
            # Ensure the ID matches the database record
            quiz_response.id = quiz.id
            
            logger.info(f"Successfully retrieved and deserialized quiz {quiz_id}")
            return quiz_response
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON deserialization error for quiz {quiz_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Quiz data is corrupted. Please contact support."
            )
        except ValueError as e:
            logger.error(f"Quiz data validation error for quiz {quiz_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Quiz data format is invalid. Please contact support."
            )
        except Exception as e:
            logger.error(f"Unexpected deserialization error for quiz {quiz_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to process quiz data. Please try again."
            )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_quiz_by_id: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while retrieving the quiz."
        )


# Additional error handling utilities and middleware
@app.middleware("http")
async def error_handling_middleware(request, call_next):
    start_time = datetime.utcnow()
    
    try:
        # Log incoming request
        logger.info(f"Request: {request.method} {request.url}")
        
        response = await call_next(request)
        
        # Log response time
        process_time = (datetime.utcnow() - start_time).total_seconds()
        logger.info(f"Response: {response.status_code} ({process_time:.3f}s)")
        
        return response
        
    except Exception as e:
        # Log the error
        process_time = (datetime.utcnow() - start_time).total_seconds()
        logger.error(f"Request failed after {process_time:.3f}s: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Return generic error response
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal Server Error",
                "message": "An unexpected error occurred during request processing.",
                "details": None
            }
        )


def validate_request_size(request_data: str, max_size: int = 1_000_000) -> None:
    """
    Validate request data size to prevent memory issues.
    
    Args:
        request_data (str): The request data to validate
        max_size (int): Maximum allowed size in bytes
        
    Raises:
        HTTPException: If request data is too large
    """
    if len(request_data.encode('utf-8')) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Request data too large (max {max_size} bytes)"
        )


def sanitize_input(input_string: str) -> str:
    """
    Sanitize input string to prevent injection attacks.
    
    Args:
        input_string (str): The input string to sanitize
        
    Returns:
        str: Sanitized string
    """
    if not input_string:
        return ""
    
    # Remove potentially dangerous characters
    sanitized = input_string.strip()
    
    # Limit length to prevent memory issues
    if len(sanitized) > 1000:
        sanitized = sanitized[:1000]
    
    return sanitized


# Error response helper functions
def create_error_response(error_type: str, message: str, details: Optional[str] = None) -> dict:
    """
    Create a standardized error response.
    
    Args:
        error_type (str): The type of error
        message (str): Human-readable error message
        details (str, optional): Additional error details
        
    Returns:
        dict: Standardized error response
    """
    return {
        "error": error_type,
        "message": message,
        "details": details,
        "timestamp": datetime.utcnow().isoformat()
    }


# Handle database errors with appropriate HTTP responses.
def handle_database_error(e: Exception, operation: str) -> HTTPException:
    logger.error(f"Database error during {operation}: {str(e)}")
    
    if isinstance(e, SQLAlchemyError):
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during {operation}. Please try again."
        )
    else:
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during {operation}. Please try again."
        )


def handle_validation_error(e: Exception, context: str) -> HTTPException:
    logger.warning(f"Validation error in {context}: {str(e)}")
    
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Validation failed: {str(e)}"
    )


@app.get("/api/info")
async def api_info():
    """
    Get API information and available endpoints.
    
    Returns:
        dict: API information
    """
    return {
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


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )