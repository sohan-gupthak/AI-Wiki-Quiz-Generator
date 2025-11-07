import { useState } from 'react'
import GenerateQuizTab from './tabs/GenerateQuizTab'
import HistoryTab from './tabs/HistoryTab'

function App() {
  const [activeTab, setActiveTab] = useState('generate')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            AI Wiki Quiz Generator
          </h1>
          <p className="text-gray-600">
            Transform Wikipedia articles into comprehensive educational quizzes
          </p>
        </header>

        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-sm p-1 flex">
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                activeTab === 'generate'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Generate Quiz
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Past Quizzes
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {activeTab === 'generate' && <GenerateQuizTab />}
          {activeTab === 'history' && <HistoryTab />}
        </div>
      </div>
    </div>
  )
}

export default App
