"""
Pydantic models for data validation and serialization.

This module defines all the data models used for API requests/responses
and LLM output validation in the AI Wiki Quiz Generator.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl, validator


class QuizQuestion(BaseModel):
    """
    Model for individual quiz questions with multiple choice options.
    
    Each question has exactly 4 options (A-D), one correct answer,
    difficulty level, and an explanation.
    """
    question: str = Field(..., min_length=10, max_length=500, description="The quiz question text")
    options: List[str] = Field(..., min_items=4, max_items=4, description="Exactly 4 multiple choice options")
    answer: str = Field(..., pattern="^[A-D]$", description="Correct answer (A, B, C, or D)")
    difficulty: str = Field(..., pattern="^(easy|medium|hard)$", description="Question difficulty level")
    explanation: str = Field(..., min_length=10, max_length=300, description="Explanation for the correct answer")
    
    @validator('options')
    def validate_options_not_empty(cls, v):
        """Ensure all options have content."""
        if any(not option.strip() for option in v):
            raise ValueError("All options must have content")
        return v


class KeyEntities(BaseModel):
    """
    Model for categorized key entities extracted from Wikipedia articles.
    
    Organizes important entities into people, organizations, and locations.
    """
    people: List[str] = Field(default_factory=list, description="Names of people mentioned in the article")
    organizations: List[str] = Field(default_factory=list, description="Organizations, companies, institutions")
    locations: List[str] = Field(default_factory=list, description="Countries, cities, places, geographic locations")


class QuizResponse(BaseModel):
    """
    Complete quiz response model containing all generated quiz data.
    
    This is the main response model returned by the quiz generation endpoint
    and stored in the database.
    """
    id: Optional[int] = Field(None, description="Database ID (set after storage)")
    url: str = Field(..., description="Original Wikipedia URL")
    title: str = Field(..., min_length=1, max_length=200, description="Article title")
    summary: str = Field(..., min_length=50, max_length=1000, description="Article summary (2-3 sentences)")
    key_entities: KeyEntities = Field(..., description="Categorized key entities from the article")
    sections: List[str] = Field(..., min_items=1, description="Main sections/topics covered in the article")
    quiz: List[QuizQuestion] = Field(..., min_items=5, max_items=10, description="Generated quiz questions")
    related_topics: List[str] = Field(..., min_items=3, max_items=5, description="Related Wikipedia topics for further reading")


class QuizSummary(BaseModel):
    """
    Summary model for quiz history display.
    
    Contains basic information about stored quizzes for the history tab.
    """
    id: int = Field(..., description="Database ID")
    url: str = Field(..., description="Original Wikipedia URL")
    title: str = Field(..., description="Article title")
    date_generated: datetime = Field(..., description="When the quiz was generated")


class QuizRequest(BaseModel):
    """
    Request model for quiz generation endpoint.
    
    Contains the Wikipedia URL to process.
    """
    url: str = Field(..., description="Wikipedia URL to generate quiz from")
    
    @validator('url')
    def validate_wikipedia_url(cls, v):
        """Validate that the URL is a Wikipedia URL."""
        if not v.startswith(('https://en.wikipedia.org/wiki/', 'http://en.wikipedia.org/wiki/')):
            raise ValueError("URL must be a valid English Wikipedia article URL")
        return v


class ErrorResponse(BaseModel):
    """
    Standard error response model for API endpoints.
    
    Provides consistent error messaging across the application.
    """
    error: str = Field(..., description="Error type or category")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[str] = Field(None, description="Additional error details")


class HealthResponse(BaseModel):
    """
    Health check response model.
    
    Used for application health monitoring.
    """
    status: str = Field(..., description="Application status")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Health check timestamp")
    database_connected: bool = Field(..., description="Database connection status")


# Additional validation models for internal use

class ScrapedContent(BaseModel):
    """
    Model for scraped Wikipedia content before LLM processing.
    
    Internal model used between scraping and quiz generation.
    """
    title: str = Field(..., description="Article title")
    content: str = Field(..., min_length=100, description="Cleaned article content")
    url: str = Field(..., description="Source URL")
    
    @validator('content')
    def validate_content_length(cls, v):
        """Ensure content is substantial enough for quiz generation."""
        if len(v.strip()) < 500:
            raise ValueError("Article content too short for quiz generation (minimum 500 characters)")
        return v


class LLMQuizRequest(BaseModel):
    """
    Internal model for LLM quiz generation requests.
    
    Used to structure data sent to the LLM service.
    """
    title: str = Field(..., description="Article title")
    content: str = Field(..., description="Cleaned article content")
    
    class Config:
        """Pydantic configuration."""
        json_schema_extra = {
            "example": {
                "title": "Artificial Intelligence",
                "content": "Artificial intelligence (AI) is intelligence demonstrated by machines..."
            }
        }