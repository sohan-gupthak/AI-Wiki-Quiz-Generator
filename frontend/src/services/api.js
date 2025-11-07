const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// apiRequest with error handling
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
      const errorMessage = typeof data === 'object' && data.detail 
        ? data.detail 
        : typeof data === 'string' 
        ? data 
        : `HTTP ${response.status}: ${response.statusText}`
      
      throw new Error(errorMessage)
    }

    return data
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your connection and try again.')
    }
    
    throw error
  }
}

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

export async function getQuizHistory() {
  return apiRequest('/history')
}

export async function getQuizById(quizId) {
  if (!quizId || typeof quizId !== 'number') {
    throw new Error('Quiz ID is required and must be a number')
  }

  return apiRequest(`/quiz/${quizId}`)
}

// returns {boolean} - True if valid Wikipedia URL
export function isValidWikipediaUrl(url) {
  if (!url || typeof url !== 'string') {
    return false
  }
  
  const wikipediaUrlPattern = /^https?:\/\/[a-z]{2,3}\.wikipedia\.org\/wiki\/.+/i
  return wikipediaUrlPattern.test(url)
}

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

const api = {
  generateQuiz,
  getQuizHistory,
  getQuizById,
  isValidWikipediaUrl,
  extractArticleTitle,
}

export default api