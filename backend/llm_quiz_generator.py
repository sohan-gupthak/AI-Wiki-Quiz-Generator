import os
import json
import logging
import time
from typing import Dict, Any, Optional
from dotenv import load_dotenv

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.exceptions import OutputParserException
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.runnables import RunnablePassthrough
from pydantic import ValidationError

from models import QuizResponse, LLMQuizRequest

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LLMQuizGenerator:
    
    def __init__(self):
        """Initialize the LLM quiz generator with Gemini API."""
        self.api_key = self._get_api_key()
        self.model = self._initialize_model()
        self.output_parser = JsonOutputParser(pydantic_object=QuizResponse)
        self.prompt_template = self._create_prompt_template()
        self.chain = None
        
    def _get_api_key(self) -> str:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError(
                "GOOGLE_API_KEY environment variable is required. "
                "Please set it in your .env file or environment."
            )
        return api_key
    
    def _initialize_model(self) -> ChatGoogleGenerativeAI:
        """
        Returns:
            ChatGoogleGenerativeAI: Configured Gemini model instance
        """
        try:
            model = ChatGoogleGenerativeAI(
                model="gemini-2.5-pro",
                google_api_key=self.api_key,
                temperature=0.3,  # Lower temperature for more consistent output
                max_output_tokens=4096,  # Sufficient for comprehensive quiz data
                convert_system_message_to_human=True  # Required for Gemini
            )
            logger.info("Gemini model initialized successfully")
            return model
        except Exception as e:
            logger.error(f"Failed to initialize Gemini model: {str(e)}")
            raise
    
    def _create_prompt_template(self) -> PromptTemplate:
        """
        Create the comprehensive prompt template for quiz generation.
        
        The prompt is designed to ensure high-quality, grounded quiz generation
        that prevents hallucination and enforces structure.
        
        Returns:
            PromptTemplate: The configured prompt template
        """
        template = """You are an expert educational content creator specializing in transforming Wikipedia articles into comprehensive, structured quizzes. Your task is to analyze the provided article and generate educational content that is entirely grounded in the source material.

ARTICLE INFORMATION:
Title: {title}
Content: {content}

GENERATION REQUIREMENTS:

1. SUMMARY (2-3 sentences):
   - Provide a concise overview of the main topic
   - Focus on the most important aspects covered in the article
   - Use clear, accessible language

2. KEY ENTITIES (Extract and categorize):
   - People: Names of individuals mentioned (historical figures, scientists, leaders, etc.)
   - Organizations: Companies, institutions, groups, governments, agencies
   - Locations: Countries, cities, regions, geographic features, landmarks

3. SECTIONS (Main topics covered):
   - List the primary sections or themes from the article
   - Focus on substantial content areas, not minor subsections
   - Use clear, descriptive names

4. QUIZ QUESTIONS (Generate 5-10 questions):
   For each question, ensure:
   - Question is clear, specific, and tests understanding (not just memorization)
   - Exactly 4 options labeled A, B, C, D
   - One correct answer based strictly on article content
   - Difficulty level: "easy" (basic facts), "medium" (connections/analysis), or "hard" (complex concepts)
   - Brief explanation that references the specific article section or context
   - Vary difficulty levels across all questions
   - Cover different aspects of the article, not just the introduction

5. RELATED TOPICS (3-5 suggestions):
   - Suggest related Wikipedia topics for further reading
   - Base suggestions on concepts, people, or themes mentioned in the article
   - Provide topics that would naturally extend the reader's knowledge

CRITICAL GUIDELINES:
- Base ALL content strictly on the provided article - do not add external knowledge
- Ensure questions test comprehension and analysis, not trivial details
- Make explanations educational and reference specific parts of the article
- Avoid questions about exact dates unless they are central to the topic
- Ensure all extracted entities are actually mentioned in the article
- Keep language clear and accessible for educational purposes
- Maintain consistency in terminology throughout

QUALITY STANDARDS:
- Questions should be unambiguous with only one clearly correct answer
- Options should be plausible but distinctly different
- Explanations should help readers understand why the answer is correct
- All content must be verifiable from the source article

{format_instructions}

Generate the response in the exact JSON format specified above. Ensure all fields are properly filled and the structure matches the requirements exactly."""
        
        return PromptTemplate(
            template=template,
            input_variables=["title", "content"],
            partial_variables={"format_instructions": self.output_parser.get_format_instructions()}
        )
    
    def get_chain(self):
        """
        Get or create the LangChain processing chain.
        
        Creates a chain that combines prompt template, model, and JSON parser
        with proper input formatting.
        """
        if self.chain is None:
            self.chain = (
                self.prompt_template
                | self.model
                | self.output_parser
            )
        return self.chain
    
    def validate_environment(self) -> Dict[str, Any]:
        validation_results = {
            "api_key_configured": bool(self.api_key),
            "model_initialized": self.model is not None,
            "parser_configured": self.output_parser is not None,
            "prompt_template_created": self.prompt_template is not None
        }
        
        logger.info(f"Environment validation: {validation_results}")
        return validation_results
    
    async def generate_quiz(self, title: str, content: str, max_retries: int = 3) -> QuizResponse:
        """
        Generate a quiz from Wikipedia article content with error handling and retry logic.
        
        Args:
            title (str): The Wikipedia article title
            content (str): The cleaned article content
            max_retries (int): Maximum number of retry attempts (default: 3)
            
        Returns:
            QuizResponse: The generated quiz data
            
        Raises:
            ValueError: If input validation fails
            RuntimeError: If quiz generation fails after all retries
        """
        # Input validation
        if not title or not title.strip():
            raise ValueError("Article title cannot be empty")
        
        if not content or len(content.strip()) < 500:
            raise ValueError("Article content too short for quiz generation (minimum 500 characters)")
        
        # Prepare input data
        input_data = {
            "title": title.strip(),
            "content": content.strip()
        }
        
        chain = self.get_chain()
        last_error = None
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Quiz generation attempt {attempt + 1}/{max_retries} for article: {title}")
                
                # Generate quiz using the chain
                result = await chain.ainvoke(input_data)
                
                # Validate the result structure
                if not isinstance(result, dict):
                    raise ValueError(f"Expected dict result, got {type(result)}")
                
                # Create QuizResponse object with validation
                # Remove url from result if it exists to avoid duplicate parameter
                result_copy = result.copy()
                result_copy.pop('url', None)  # Remove url if present
                
                quiz_response = QuizResponse(
                    url="",  # Will be set by the calling function
                    **result_copy
                )
                
                # Additional validation
                self._validate_quiz_response(quiz_response)
                
                logger.info(f"Quiz generated successfully for article: {title}")
                return quiz_response
                
            except OutputParserException as e:
                last_error = f"JSON parsing failed: {str(e)}"
                logger.warning(f"Attempt {attempt + 1} failed - {last_error}")
                
            except ValidationError as e:
                last_error = f"Data validation failed: {str(e)}"
                logger.warning(f"Attempt {attempt + 1} failed - {last_error}")
                
            except Exception as e:
                last_error = f"Unexpected error: {str(e)}"
                logger.warning(f"Attempt {attempt + 1} failed - {last_error}")
            
            # Wait before retry (exponential backoff)
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # 1s, 2s, 4s
                logger.info(f"Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
        
        # All retries failed
        error_msg = f"Quiz generation failed after {max_retries} attempts. Last error: {last_error}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)
    
    def _validate_quiz_response(self, quiz_response: QuizResponse) -> None:
        """
        Args:
            quiz_response (QuizResponse): The quiz response to validate
            
        Raises:
            ValueError: If validation fails
        """
        # Validate quiz questions
        if not quiz_response.quiz or len(quiz_response.quiz) < 5:
            raise ValueError("Quiz must contain at least 5 questions")
        
        if len(quiz_response.quiz) > 10:
            raise ValueError("Quiz must contain at most 10 questions")
        
        # Validate each question
        for i, question in enumerate(quiz_response.quiz):
            if len(question.options) != 4:
                raise ValueError(f"Question {i+1} must have exactly 4 options")
            
            if question.answer not in ['A', 'B', 'C', 'D']:
                raise ValueError(f"Question {i+1} answer must be A, B, C, or D")
            
            if question.difficulty not in ['easy', 'medium', 'hard']:
                raise ValueError(f"Question {i+1} difficulty must be easy, medium, or hard")
        
        # Validate other fields
        if not quiz_response.title or len(quiz_response.title.strip()) == 0:
            raise ValueError("Quiz title cannot be empty")
        
        if not quiz_response.summary or len(quiz_response.summary.strip()) < 50:
            raise ValueError("Quiz summary must be at least 50 characters")
        
        if not quiz_response.sections:
            raise ValueError("Quiz must have at least one section")
        
        if len(quiz_response.related_topics) < 3:
            raise ValueError("Quiz must have at least 3 related topics")
        
        logger.info("Quiz response validation passed")


# Global instance for use across the application
llm_quiz_generator = None


def get_llm_quiz_generator() -> LLMQuizGenerator:
    global llm_quiz_generator
    if llm_quiz_generator is None:
        llm_quiz_generator = LLMQuizGenerator()
    return llm_quiz_generator


async def generate_quiz_from_content(title: str, content: str, url: str = "") -> QuizResponse:
    """
    Args:
        title (str): The Wikipedia article title
        content (str): The cleaned article content
        url (str): The original Wikipedia URL (optional)
        
    Returns:
        QuizResponse: The generated quiz data
        
    Raises:
        ValueError: If input validation fails
        RuntimeError: If quiz generation fails
    """
    try:
        generator = get_llm_quiz_generator()
        quiz_response = await generator.generate_quiz(title, content)
        
        # Set the URL if provided
        if url:
            quiz_response.url = url
            
        return quiz_response
        
    except Exception as e:
        logger.error(f"Quiz generation failed for title '{title}': {str(e)}")
        raise


def validate_llm_setup() -> Dict[str, Any]:
    """
    Validate the complete LLM setup.
    
    Returns:
        Dict[str, Any]: Validation results
    """
    try:
        generator = get_llm_quiz_generator()
        return generator.validate_environment()
    except Exception as e:
        logger.error(f"LLM setup validation failed: {str(e)}")
        return {
            "error": str(e),
            "api_key_configured": False,
            "model_initialized": False,
            "parser_configured": False,
            "prompt_template_created": False
        }


if __name__ == "__main__":
    # Test the setup when run directly
    print("Testing LLM Quiz Generator setup...")
    results = validate_llm_setup()
    print(f"Validation results: {json.dumps(results, indent=2)}")
    
    # Test with sample content if API key is available
    if results.get("api_key_configured"):
        print("\nTesting quiz generation with sample content...")
        import asyncio
        
        sample_title = "Artificial Intelligence"
        sample_content = """
        Artificial intelligence (AI) is intelligence demonstrated by machines, in contrast to the natural intelligence displayed by humans and animals. Leading AI textbooks define the field as the study of "intelligent agents": any device that perceives its environment and takes actions that maximize its chance of successfully achieving its goals. Colloquially, the term "artificial intelligence" is often used to describe machines (or computers) that mimic "cognitive" functions that humans associate with the human mind, such as "learning" and "problem solving".
        
        The scope of AI is disputed: as machines become increasingly capable, tasks considered to require "intelligence" are often removed from the definition of AI, a phenomenon known as the AI effect. A quip in Tesler's Theorem says "AI is whatever hasn't been done yet." For instance, optical character recognition is frequently excluded from things considered to be AI, having become a routine technology.
        
        Modern machine learning techniques are at the core of AI. Problems for AI applications include reasoning, knowledge representation, planning, learning, natural language processing, perception, and the ability to move and manipulate objects. General intelligence is among the field's long-term goals.
        """
        
        async def test_generation():
            try:
                result = await generate_quiz_from_content(sample_title, sample_content)
                print(f"✓ Quiz generation successful!")
                print(f"  - Generated {len(result.quiz)} questions")
                print(f"  - Found {len(result.key_entities.people)} people, {len(result.key_entities.organizations)} organizations, {len(result.key_entities.locations)} locations")
                print(f"  - Identified {len(result.sections)} sections")
                print(f"  - Suggested {len(result.related_topics)} related topics")
            except Exception as e:
                print(f"✗ Quiz generation failed: {str(e)}")
        
        try:
            asyncio.run(test_generation())
        except Exception as e:
            print(f"Test execution failed: {str(e)}")
    else:
        print("Skipping quiz generation test - API key not configured")