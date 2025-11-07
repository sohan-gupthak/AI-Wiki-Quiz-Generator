"""
Wikipedia content scraper for the AI Wiki Quiz Generator.

This module provides functionality to scrape and clean Wikipedia articles,
extracting main content while removing boilerplate, references, and tables.
"""

import re
import requests
from bs4 import BeautifulSoup
from typing import Optional, Tuple
from urllib.parse import urlparse
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Request configuration
REQUEST_TIMEOUT = 30  # seconds
MAX_CONTENT_LENGTH = 5_000_000  # 5MB limit for content (Wikipedia articles can be large)
USER_AGENT = "AI-Wiki-Quiz-Generator/1.0 (Educational Tool)"

# Wikipedia URL patterns
WIKIPEDIA_URL_PATTERNS = [
    r'^https?://en\.wikipedia\.org/wiki/[^/]+$',
    r'^https?://[a-z]{2}\.wikipedia\.org/wiki/[^/]+$'  # Support other language codes
]


def is_valid_wikipedia_url(url: str) -> bool:
    """
    Validate if the provided URL is a valid Wikipedia article URL.
    
    Args:
        url (str): The URL to validate
        
    Returns:
        bool: True if valid Wikipedia URL, False otherwise
    """
    if not url or not isinstance(url, str):
        return False
    
    # Basic URL format validation
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return False
    except Exception:
        return False
    
    # Check URL format against patterns
    for pattern in WIKIPEDIA_URL_PATTERNS:
        if re.match(pattern, url):
            # Additional checks
            parsed = urlparse(url)
            
            # Ensure it's not a special page
            wiki_path = parsed.path
            if any(special in wiki_path.lower() for special in [
                'special:', 'talk:', 'user:', 'category:', 'file:', 'template:',
                'help:', 'portal:', 'wikipedia:', 'mediawiki:'
            ]):
                return False
            
            # Ensure it's not a disambiguation or redirect page URL pattern
            if '#' in url or '?' in url:
                return False
            
            # Check for valid article path (must have /wiki/ and article name)
            if '/wiki/' not in wiki_path or wiki_path.endswith('/wiki/'):
                return False
                
            return True
    
    return False


def validate_url_accessibility(url: str) -> Tuple[bool, str]:
    """
    Validate if a Wikipedia URL is accessible without full scraping.
    
    Args:
        url (str): Wikipedia URL to validate
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if not is_valid_wikipedia_url(url):
        return False, "Invalid Wikipedia URL format"
    
    try:
        # Make a HEAD request to check if URL is accessible
        headers = {'User-Agent': USER_AGENT}
        response = requests.head(url, headers=headers, timeout=10, allow_redirects=True)
        
        if response.status_code == 404:
            return False, "Wikipedia article not found"
        elif response.status_code >= 400:
            return False, f"HTTP error: {response.status_code}"
        
        # Check content type
        content_type = response.headers.get('content-type', '').lower()
        if 'text/html' not in content_type:
            return False, "Invalid content type - not an HTML page"
        
        return True, "URL is accessible"
        
    except requests.exceptions.Timeout:
        return False, "Request timeout - Wikipedia may be unavailable"
    except requests.exceptions.ConnectionError:
        return False, "Connection error - check internet connection"
    except requests.exceptions.RequestException as e:
        return False, f"Network error: {str(e)}"
    except Exception as e:
        return False, f"Validation error: {str(e)}"


def extract_article_title(soup: BeautifulSoup) -> str:
    """
    Extract the article title from Wikipedia HTML.
    
    Args:
        soup (BeautifulSoup): Parsed HTML content
        
    Returns:
        str: Article title
    """
    # Try multiple selectors for title
    title_selectors = [
        'h1.firstHeading',
        'h1#firstHeading', 
        '.mw-page-title-main',
        'h1'
    ]
    
    for selector in title_selectors:
        title_element = soup.select_one(selector)
        if title_element:
            title = title_element.get_text().strip()
            if title:
                return title
    
    # Fallback to page title
    title_tag = soup.find('title')
    if title_tag:
        title = title_tag.get_text().strip()
        # Remove " - Wikipedia" suffix
        title = re.sub(r'\s*-\s*Wikipedia.*$', '', title)
        return title
    
    return "Unknown Article"


def clean_wikipedia_content(soup: BeautifulSoup) -> str:
    """
    Clean Wikipedia HTML content by removing unwanted elements.
    
    Args:
        soup (BeautifulSoup): Parsed HTML content
        
    Returns:
        str: Cleaned article text
    """
    # Find the main content area
    content_div = soup.find('div', {'id': 'mw-content-text'})
    if not content_div:
        content_div = soup.find('div', {'class': 'mw-parser-output'})
    if not content_div:
        # Fallback to body if specific content div not found
        content_div = soup.find('body')
    
    if not content_div:
        return ""
    
    # Remove unwanted elements
    unwanted_selectors = [
        # References and citations
        'sup.reference',
        '.reference',
        '.references',
        'ol.references',
        
        # Navigation and metadata
        '.navbox',
        '.navigation-box',
        '.infobox',
        '.metadata',
        '.dablink',
        '.hatnote',
        
        # Tables (most are not content)
        'table.wikitable',
        'table.infobox',
        'table.navbox',
        
        # Media and captions
        '.thumbcaption',
        '.gallery',
        
        # Navigation elements
        '.toc',
        '#toc',
        '.mw-editsection',
        
        # Footer and administrative
        '.catlinks',
        '.printfooter',
        '.mw-footer',
        
        # Scripts and styles
        'script',
        'style',
        'noscript',
        
        # Coordinates and geo data
        '.geo',
        '.coordinates',
        
        # Sidebar content
        '.sidebar',
        '.vertical-navbox',
        
        # Disambiguation
        '.dmbox',
        '.ambox'
    ]
    
    # Remove unwanted elements
    for selector in unwanted_selectors:
        for element in content_div.select(selector):
            element.decompose()
    
    # Remove elements with specific classes that indicate non-content
    for element in content_div.find_all(attrs={'class': True}):
        classes = element.get('class', [])
        if any(cls in ['mbox', 'ambox', 'tmbox', 'imbox', 'ombox', 'fmbox'] for cls in classes):
            element.decompose()
    
    # Extract text content
    text = content_div.get_text()
    
    # Clean up the text
    text = clean_text_content(text)
    
    return text


def clean_text_content(text: str) -> str:
    """
    Clean extracted text content.
    
    Args:
        text (str): Raw extracted text
        
    Returns:
        str: Cleaned text
    """
    # Remove citation markers like [1], [citation needed], etc.
    text = re.sub(r'\[[^\]]*\]', '', text)
    
    # Remove multiple whitespace and normalize
    text = re.sub(r'\s+', ' ', text)
    
    # Remove leading/trailing whitespace
    text = text.strip()
    
    # Remove common Wikipedia boilerplate phrases
    boilerplate_patterns = [
        r'Coordinates:.*?(?=\n|\.|$)',
        r'This article needs additional citations.*?(?=\n|\.|$)',
        r'Please help improve this article.*?(?=\n|\.|$)',
        r'This article may require cleanup.*?(?=\n|\.|$)',
        r'The examples and perspective in this article.*?(?=\n|\.|$)',
    ]
    
    for pattern in boilerplate_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    # Clean up any remaining multiple spaces
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text


async def scrape_wikipedia(url: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Scrape Wikipedia article content and extract title and cleaned text.
    
    Args:
        url (str): Wikipedia URL to scrape
        
    Returns:
        Tuple[Optional[str], Optional[str]]: (title, content) or (None, None) if failed
        
    Raises:
        ValueError: If URL is invalid or content issues
        requests.RequestException: If network request fails
        Exception: For other scraping errors
    """
    # Validate URL format first
    if not is_valid_wikipedia_url(url):
        raise ValueError(f"Invalid Wikipedia URL format: {url}")
    
    # Pre-validate URL accessibility
    is_accessible, error_msg = validate_url_accessibility(url)
    if not is_accessible:
        raise ValueError(f"URL validation failed: {error_msg}")
    
    try:
        logger.info(f"Scraping Wikipedia article: {url}")
        
        # Configure request headers
        headers = {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
        }
        
        # Make request with timeout and retries
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.get(
                    url, 
                    headers=headers, 
                    timeout=REQUEST_TIMEOUT,
                    allow_redirects=True
                )
                break
            except requests.exceptions.Timeout:
                if attempt == max_retries - 1:
                    raise
                logger.warning(f"Timeout on attempt {attempt + 1}, retrying...")
                continue
            except requests.exceptions.ConnectionError:
                if attempt == max_retries - 1:
                    raise
                logger.warning(f"Connection error on attempt {attempt + 1}, retrying...")
                continue
        
        # Check response status
        response.raise_for_status()
        
        # Check content length
        if len(response.content) > MAX_CONTENT_LENGTH:
            raise ValueError(f"Article content too large: {len(response.content)} bytes (max: {MAX_CONTENT_LENGTH})")
        
        # Check if it's actually HTML
        content_type = response.headers.get('content-type', '').lower()
        if 'text/html' not in content_type:
            raise ValueError(f"Invalid content type: {content_type} (expected HTML)")
        
        # Parse HTML with error handling
        try:
            soup = BeautifulSoup(response.content, 'html.parser')
        except Exception as e:
            raise ValueError(f"Failed to parse HTML content: {str(e)}")
        
        # Check if page exists (Wikipedia shows specific messages for missing pages)
        error_indicators = [
            "Wikipedia does not have an article",
            "The page you requested does not exist",
            "This page does not exist"
        ]
        
        for indicator in error_indicators:
            if indicator in response.text:
                raise ValueError("Wikipedia article not found")
        
        # Check for disambiguation pages
        if (soup.find('div', {'class': 'disambig'}) or 
            'may refer to:' in response.text or
            soup.find('div', {'id': 'disambigbox'})):
            raise ValueError("URL points to a disambiguation page - please use a specific article URL")
        
        # Check for redirect pages
        if soup.find('div', {'class': 'redirectMsg'}):
            logger.info("Page was redirected, continuing with redirected content")
        
        # Extract title and content
        try:
            title = extract_article_title(soup)
            content = clean_wikipedia_content(soup)
        except Exception as e:
            raise ValueError(f"Failed to extract article content: {str(e)}")
        
        # Validate extracted content
        if not title or not title.strip():
            raise ValueError("Failed to extract article title")
        
        if not content or not content.strip():
            raise ValueError("Failed to extract article content")
        
        if len(content.strip()) < 500:
            raise ValueError(f"Article content too short for quiz generation ({len(content.strip())} characters, minimum 500)")
        
        # Check for stub articles
        if len(content.strip()) < 1000 and ('stub' in content.lower() or len(content.split()) < 100):
            logger.warning(f"Article appears to be a stub: {title}")
        
        logger.info(f"Successfully scraped article: {title} ({len(content)} characters)")
        
        return title, content
        
    except requests.exceptions.Timeout:
        logger.error(f"Request timeout for URL: {url}")
        raise requests.RequestException(f"Request timeout after {REQUEST_TIMEOUT} seconds - Wikipedia may be slow or unavailable")
    
    except requests.exceptions.ConnectionError:
        logger.error(f"Connection error for URL: {url}")
        raise requests.RequestException("Failed to connect to Wikipedia - check your internet connection")
    
    except requests.exceptions.HTTPError as e:
        logger.error(f"HTTP error for URL {url}: {e}")
        if e.response.status_code == 404:
            raise ValueError("Wikipedia article not found (404 error)")
        elif e.response.status_code == 403:
            raise requests.RequestException("Access forbidden - Wikipedia may be blocking requests")
        elif e.response.status_code >= 500:
            raise requests.RequestException(f"Wikipedia server error: {e.response.status_code}")
        else:
            raise requests.RequestException(f"HTTP error: {e.response.status_code} - {e.response.reason}")
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error for URL {url}: {e}")
        raise requests.RequestException(f"Network error while accessing Wikipedia: {str(e)}")
    
    except ValueError as e:
        # Re-raise ValueError as-is (these are validation errors)
        logger.error(f"Validation error for URL {url}: {e}")
        raise
    
    except Exception as e:
        logger.error(f"Unexpected error scraping {url}: {e}")
        raise Exception(f"Failed to scrape Wikipedia article: {str(e)}")


def scrape_wikipedia_with_validation(url: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Scrape Wikipedia with comprehensive validation and error reporting.
    
    Args:
        url (str): Wikipedia URL to scrape
        
    Returns:
        Tuple[Optional[str], Optional[str], Optional[str]]: (title, content, error_message)
        If successful: (title, content, None)
        If failed: (None, None, error_message)
    """
    try:
        title, content = scrape_wikipedia_sync(url)
        return title, content, None
    except ValueError as e:
        return None, None, f"Validation Error: {str(e)}"
    except requests.RequestException as e:
        return None, None, f"Network Error: {str(e)}"
    except Exception as e:
        return None, None, f"Scraping Error: {str(e)}"


# Synchronous wrapper for backward compatibility
def scrape_wikipedia_sync(url: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Synchronous wrapper for scrape_wikipedia function.
    
    Args:
        url (str): Wikipedia URL to scrape
        
    Returns:
        Tuple[Optional[str], Optional[str]]: (title, content) or (None, None) if failed
    """
    import asyncio
    
    try:
        # Try to get existing event loop
        try:
            loop = asyncio.get_running_loop()
            # If we're in an async context, we need to handle this differently
            # For now, we'll use a simple synchronous approach
            return _scrape_wikipedia_sync_internal(url)
        except RuntimeError:
            # No running loop, we can use asyncio.run
            return asyncio.run(scrape_wikipedia(url))
    except Exception:
        # Fallback to synchronous implementation
        return _scrape_wikipedia_sync_internal(url)


def _scrape_wikipedia_sync_internal(url: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Internal synchronous implementation of Wikipedia scraping.
    
    Args:
        url (str): Wikipedia URL to scrape
        
    Returns:
        Tuple[Optional[str], Optional[str]]: (title, content) or (None, None) if failed
    """
    # Validate URL format first
    if not is_valid_wikipedia_url(url):
        raise ValueError(f"Invalid Wikipedia URL format: {url}")
    
    # Pre-validate URL accessibility
    is_accessible, error_msg = validate_url_accessibility(url)
    if not is_accessible:
        raise ValueError(f"URL validation failed: {error_msg}")
    
    try:
        logger.info(f"Scraping Wikipedia article: {url}")
        
        # Configure request headers
        headers = {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
        }
        
        # Make request with timeout
        response = requests.get(
            url, 
            headers=headers, 
            timeout=REQUEST_TIMEOUT,
            allow_redirects=True
        )
        
        # Check response status
        response.raise_for_status()
        
        # Check content length
        if len(response.content) > MAX_CONTENT_LENGTH:
            raise ValueError(f"Article content too large: {len(response.content)} bytes (max: {MAX_CONTENT_LENGTH})")
        
        # Check if it's actually HTML
        content_type = response.headers.get('content-type', '').lower()
        if 'text/html' not in content_type:
            raise ValueError(f"Invalid content type: {content_type} (expected HTML)")
        
        # Parse HTML with error handling
        try:
            soup = BeautifulSoup(response.content, 'html.parser')
        except Exception as e:
            raise ValueError(f"Failed to parse HTML content: {str(e)}")
        
        # Check if page exists
        error_indicators = [
            "Wikipedia does not have an article",
            "The page you requested does not exist",
            "This page does not exist"
        ]
        
        for indicator in error_indicators:
            if indicator in response.text:
                raise ValueError("Wikipedia article not found")
        
        # Check for disambiguation pages
        if (soup.find('div', {'class': 'disambig'}) or 
            'may refer to:' in response.text or
            soup.find('div', {'id': 'disambigbox'})):
            raise ValueError("URL points to a disambiguation page - please use a specific article URL")
        
        # Extract title and content
        try:
            title = extract_article_title(soup)
            content = clean_wikipedia_content(soup)
        except Exception as e:
            raise ValueError(f"Failed to extract article content: {str(e)}")
        
        # Validate extracted content
        if not title or not title.strip():
            raise ValueError("Failed to extract article title")
        
        if not content or not content.strip():
            raise ValueError("Failed to extract article content")
        
        if len(content.strip()) < 500:
            raise ValueError(f"Article content too short for quiz generation ({len(content.strip())} characters, minimum 500)")
        
        logger.info(f"Successfully scraped article: {title} ({len(content)} characters)")
        
        return title, content
        
    except requests.exceptions.Timeout:
        logger.error(f"Request timeout for URL: {url}")
        raise requests.RequestException(f"Request timeout after {REQUEST_TIMEOUT} seconds")
    
    except requests.exceptions.ConnectionError:
        logger.error(f"Connection error for URL: {url}")
        raise requests.RequestException("Failed to connect to Wikipedia")
    
    except requests.exceptions.HTTPError as e:
        logger.error(f"HTTP error for URL {url}: {e}")
        if e.response.status_code == 404:
            raise ValueError("Wikipedia article not found (404 error)")
        else:
            raise requests.RequestException(f"HTTP error: {e.response.status_code}")
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error for URL {url}: {e}")
        raise requests.RequestException(f"Network error: {str(e)}")
    
    except ValueError as e:
        logger.error(f"Validation error for URL {url}: {e}")
        raise
    
    except Exception as e:
        logger.error(f"Unexpected error scraping {url}: {e}")
        raise Exception(f"Failed to scrape Wikipedia article: {str(e)}")


if __name__ == "__main__":
    # Test the scraper with a sample URL
    test_url = "https://en.wikipedia.org/wiki/Artificial_intelligence"
    
    try:
        title, content = scrape_wikipedia_sync(test_url)
        print(f"Title: {title}")
        print(f"Content length: {len(content)} characters")
        print(f"Content preview: {content[:200]}...")
    except Exception as e:
        print(f"Error: {e}")