"""
Database configuration and models for the AI Wiki Quiz Generator.

This module sets up SQLAlchemy engine, session management, and defines
the Quiz model for storing quiz data in PostgreSQL.
"""

import os
from datetime import datetime
from typing import Optional

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:password@localhost:5432/quiz_generator"
)

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    echo=True,  # Set to False in production
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=3600,   # Recycle connections every hour
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create declarative base
Base = declarative_base()


class Quiz(Base):
    """
    Quiz model for storing Wikipedia quiz data.
    
    Stores complete quiz information including scraped content,
    generated quiz data, and metadata.
    """
    __tablename__ = "quiz"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    url = Column(String(500), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    date_generated = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    scraped_content = Column(Text, nullable=True)  # Optional: raw HTML storage
    full_quiz_data = Column(Text, nullable=False)  # JSON serialized quiz data
    
    def __repr__(self):
        return f"<Quiz(id={self.id}, title='{self.title}', url='{self.url}')>"


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)


def drop_tables():
    Base.metadata.drop_all(bind=engine)


def init_database():
    try:
        create_tables()
        print("Database tables created successfully")
    except Exception as e:
        print(f"Error creating database tables: {e}")
        raise


def get_database_info():
    return {
        "database_url": DATABASE_URL.replace(DATABASE_URL.split('@')[0].split('//')[1], "***"),
        "engine_info": str(engine.url).replace(str(engine.url).split('@')[0].split('//')[1], "***"),
        "pool_size": engine.pool.size(),
        "checked_out_connections": engine.pool.checkedout(),
    }


# Database session dependency for FastAPI
def get_database_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()