import { useState, useEffect } from 'react'
import { getQuizHistory, getQuizById } from '../services/api'
import QuizDisplay from '../components/QuizDisplay'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

function HistoryTab() {
  const [quizHistory, setQuizHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false)
  const [quizError, setQuizError] = useState('')

  useEffect(() => {
    fetchQuizHistory()
  }, [])

  const fetchQuizHistory = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const history = await getQuizHistory()
      setQuizHistory(history)
    } catch (err) {
      setError(err.message || 'Failed to load quiz history')
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDetails = async (quizId) => {
    setIsLoadingQuiz(true)
    setQuizError('')
    setIsModalOpen(true)
    
    try {
      const quizData = await getQuizById(quizId)
      setSelectedQuiz(quizData)
    } catch (err) {
      setQuizError(err.message || 'Failed to load quiz details')
      setSelectedQuiz(null)
    } finally {
      setIsLoadingQuiz(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedQuiz(null)
    setQuizError('')
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const truncateUrl = (url, maxLength = 50) => {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength) + '...'
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Loading quiz history...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Past Quizzes
          </h2>
          <button
            onClick={fetchQuizHistory}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors text-sm"
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
        
        <ErrorMessage message={error} />
        
        {quizHistory.length === 0 && !error ? (
          <div className="text-center py-12 text-gray-500">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg">No quizzes generated yet.</p>
            <p className="text-sm mt-1">Generate your first quiz to see it here!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">URL</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date Generated</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quizHistory.map((quiz) => (
                  <tr key={quiz.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-800 font-mono text-sm">{quiz.id}</td>
                    <td className="py-3 px-4 text-gray-800 font-medium">{quiz.title}</td>
                    <td className="py-3 px-4">
                      <a 
                        href={quiz.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                        title={quiz.url}
                      >
                        {truncateUrl(quiz.url)}
                      </a>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {formatDate(quiz.date_generated)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewDetails(quiz.id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quiz Details Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Quiz Details">
        {isLoadingQuiz ? (
          <div className="text-center py-8">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600 mt-4">Loading quiz details...</p>
          </div>
        ) : quizError ? (
          <ErrorMessage message={quizError} />
        ) : selectedQuiz ? (
          <div className="max-h-96 overflow-y-auto">
            <QuizDisplay quizData={selectedQuiz} showAnswers={false} />
          </div>
        ) : null}
      </Modal>
    </>
  )
}

export default HistoryTab