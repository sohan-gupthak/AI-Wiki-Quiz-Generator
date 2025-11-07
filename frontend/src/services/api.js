// API service layer for communicating with the backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Generic API request handler with error handling
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - API response data
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)
    
    // Handle non-JSON responses or empty responses
    let data
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      // Extract error message from response
      const errorMessage = typeof data === 'object' && data.detail 
        ? data.detail 
        : typeof data === 'string' 
        ? data 
        : `HTTP ${response.status}: ${response.statusText}`
      
      throw new Error(errorMessage)
    }

    return data
  } catch (error) {
    // Handle network errors and other exceptions
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your connection and try again.')
    }
    
    // Re-throw API errors with original message
    throw error
  }
}

/**
 * Generate a quiz from a Wikipedia URL
 * @param {string} url - Wikipedia URL
 * @returns {Promise<object>} - Quiz response object
 */
export async function generateQuiz(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required and must be a string')
  }

  // Basic Wikipedia URL validation
  const wikipediaUrlPattern = /^https?:\/\/[a-z]{2,3}\.wikipedia\.org\/wiki\/.+/i
  if (!wikipediaUrlPattern.test(url)) {
    throw new Error('Please provide a valid Wikipedia URL (e.g., https://en.wikipedia.org/wiki/Article_Name)')
  }

  return apiRequest('/generate_quiz', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}

/**
 * Get quiz history (list of all generated quizzes)
 * @returns {Promise<Array>} - Array of quiz summary objects
 */
export async function getQuizHistory() {
  return apiRequest('/history')
}

/**
 * Get a specific quiz by ID
 * @param {number} quizId - Quiz ID
 * @returns {Promise<object>} - Complete quiz object
 */
export async function getQuizById(quizId) {
  if (!quizId || typeof quizId !== 'number') {
    throw new Error('Quiz ID is required and must be a number')
  }

  return apiRequest(`/quiz/${quizId}`)
}

/**
 * Validate a Wikipedia URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid Wikipedia URL
 */
export function isValidWikipediaUrl(url) {
  if (!url || typeof url !== 'string') {
    return false
  }
  
  const wikipediaUrlPattern = /^https?:\/\/[a-z]{2,3}\.wikipedia\.org\/wiki\/.+/i
  return wikipediaUrlPattern.test(url)
}

/**
 * Extract article title from Wikipedia URL for preview
 * @param {string} url - Wikipedia URL
 * @returns {string} - Article title or empty string if invalid
 */
export function extractArticleTitle(url) {
  if (!isValidWikipediaUrl(url)) {
    return ''
  }
  
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    const titlePart = pathParts[pathParts.length - 1]
    
    // Decode URL encoding and replace underscores with spaces
    return decodeURIComponent(titlePart).replace(/_/g, ' ')
  } catch {
    return ''
  }
}

// Export default object with all API functions
const api = {
  generateQuiz,
  getQuizHistory,
  getQuizById,
  isValidWikipediaUrl,
  extractArticleTitle,
}

export default api