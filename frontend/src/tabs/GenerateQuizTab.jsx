import { useState } from 'react'
import { generateQuiz, isValidWikipediaUrl, extractArticleTitle } from '../services/api'
import QuizDisplay from '../components/QuizDisplay'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

function GenerateQuizTab() {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [quizData, setQuizData] = useState(null)
  const [urlPreview, setUrlPreview] = useState('')
  const [takeQuizMode, setTakeQuizMode] = useState(false)

  const handleUrlChange = (e) => {
    const newUrl = e.target.value
    setUrl(newUrl)
    
    // Clear previous error when user starts typing
    if (error) {
      setError('')
    }
    
    // Show article title preview for valid URLs
    if (isValidWikipediaUrl(newUrl)) {
      const title = extractArticleTitle(newUrl)
      setUrlPreview(title ? `Article: ${title}` : '')
    } else {
      setUrlPreview('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Clear previous results and errors
    setError('')
    setQuizData(null)
    
    // Validate URL
    if (!url.trim()) {
      setError('Please enter a Wikipedia URL')
      return
    }
    
    if (!isValidWikipediaUrl(url)) {
      setError('Please provide a valid Wikipedia URL (e.g., https://en.wikipedia.org/wiki/Article_Name)')
      return
    }

    setIsLoading(true)

    try {
      const result = await generateQuiz(url)
      setQuizData(result)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to generate quiz. Please try again.')
      setQuizData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateAnother = () => {
    setQuizData(null)
    setUrl('')
    setUrlPreview('')
    setError('')
    setTakeQuizMode(false)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Generate New Quiz
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              Wikipedia URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://en.wikipedia.org/wiki/Article_Name"
              className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                error && !isLoading ? 'border-red-300' : 'border-gray-300'
              }`}
              required
              disabled={isLoading}
            />
            {urlPreview && (
              <p className="text-sm text-green-600 mt-1">{urlPreview}</p>
            )}
          </div>
          
          <ErrorMessage message={error} />
          
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Generating Quiz...
              </>
            ) : (
              'Generate Quiz'
            )}
          </button>
        </form>
        
        {/* Loading state */}
        {isLoading && (
          <div className="mt-8 text-center py-8">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600 mt-4">
              Analyzing Wikipedia article and generating quiz questions...
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This may take 30-60 seconds
            </p>
          </div>
        )}
      </div>

      {/* Quiz results */}
      {quizData && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Generated Quiz</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setTakeQuizMode(!takeQuizMode)}
                className={`px-4 py-2 rounded-md transition-colors text-sm ${
                  takeQuizMode 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {takeQuizMode ? 'View Answers' : 'Take Quiz'}
              </button>
              <button
                onClick={handleGenerateAnother}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors text-sm"
              >
                Generate Another Quiz
              </button>
            </div>
          </div>
          <QuizDisplay quizData={quizData} showAnswers={!takeQuizMode} />
        </div>
      )}
    </div>
  )
}

export default GenerateQuizTab