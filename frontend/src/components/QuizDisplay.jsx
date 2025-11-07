import { useState } from 'react'

function QuizDisplay({ quizData, showAnswers = true }) {
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [showResults, setShowResults] = useState(false)
  const [groupBySection, setGroupBySection] = useState(false)

  if (!quizData) {
    return null
  }

  const handleAnswerSelect = (questionIndex, selectedOption) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: selectedOption
    }))
  }

  const handleSubmitQuiz = () => {
    setShowResults(true)
  }

  const calculateScore = () => {
    if (!quizData.quiz) return 0
    
    let correct = 0
    quizData.quiz.forEach((question, index) => {
      if (selectedAnswers[index] === question.answer) {
        correct++
      }
    })
    return correct
  }

  // Group questions by section based on explanation text
  const groupQuestionsBySection = () => {
    if (!quizData.quiz || !quizData.sections) {
      return { 'All Questions': quizData.quiz || [] }
    }

    const grouped = {}
    const unmatched = []

    quizData.quiz.forEach((question, index) => {
      let matched = false
      
      if (question.explanation) {
        for (const section of quizData.sections) {
          if (question.explanation.toLowerCase().includes(section.toLowerCase())) {
            if (!grouped[section]) {
              grouped[section] = []
            }
            grouped[section].push({ ...question, originalIndex: index })
            matched = true
            break
          }
        }
      }
      
      if (!matched) {
        unmatched.push({ ...question, originalIndex: index })
      }
    })

    // Add unmatched questions to "General" section
    if (unmatched.length > 0) {
      grouped['General'] = unmatched
    }

    return grouped
  }

  const score = showResults ? calculateScore() : 0
  const totalQuestions = quizData.quiz ? quizData.quiz.length : 0
  const groupedQuestions = groupBySection ? groupQuestionsBySection() : null

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          {quizData.title}
        </h2>
        {quizData.summary && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Summary</h3>
            <p className="text-blue-700 leading-relaxed">{quizData.summary}</p>
          </div>
        )}
      </div>

      {quizData.key_entities && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Key Entities</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {quizData.key_entities.people && quizData.key_entities.people.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  People
                </h4>
                <ul className="space-y-1">
                  {quizData.key_entities.people.map((person, index) => (
                    <li key={index} className="text-gray-600 text-sm">{person}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {quizData.key_entities.organizations && quizData.key_entities.organizations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Organizations
                </h4>
                <ul className="space-y-1">
                  {quizData.key_entities.organizations.map((org, index) => (
                    <li key={index} className="text-gray-600 text-sm">{org}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {quizData.key_entities.locations && quizData.key_entities.locations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  Locations
                </h4>
                <ul className="space-y-1">
                  {quizData.key_entities.locations.map((location, index) => (
                    <li key={index} className="text-gray-600 text-sm">{location}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {quizData.sections && quizData.sections.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Article Sections</h3>
          <div className="flex flex-wrap gap-2">
            {quizData.sections.map((section, index) => (
              <span 
                key={index}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
              >
                {section}
              </span>
            ))}
          </div>
        </div>
      )}

      {quizData.quiz && quizData.quiz.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Quiz Questions</h3>
            <div className="flex gap-3 items-center">
              {quizData.sections && quizData.sections.length > 0 && (
                <button
                  onClick={() => setGroupBySection(!groupBySection)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm"
                >
                  {groupBySection ? 'Show All' : 'Group by Section'}
                </button>
              )}
              {!showAnswers && !showResults && (
                <button
                  onClick={handleSubmitQuiz}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                  disabled={Object.keys(selectedAnswers).length !== totalQuestions}
                >
                  Submit Quiz
                </button>
              )}
            </div>
          </div>

          {showResults && !showAnswers && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <h4 className="text-lg font-semibold text-green-800">
                Quiz Results: {score}/{totalQuestions} ({Math.round((score/totalQuestions) * 100)}%)
              </h4>
            </div>
          )}

          {groupBySection ? (
            <div className="space-y-8">
              {Object.entries(groupedQuestions).map(([sectionName, questions]) => (
                <div key={sectionName} className="border-l-4 border-blue-500 pl-4">
                  <h4 className="text-lg font-semibold text-blue-800 mb-4">
                    {sectionName}
                  </h4>
                  <div className="space-y-6">
                    {questions.map((question) => {
                      const questionIndex = question.originalIndex
                      return (
                        <div key={questionIndex} className="border-b border-gray-200 pb-6 last:border-b-0">
                          <div className="flex justify-between items-start mb-3">
                            <h5 className="text-lg font-medium text-gray-800 flex-1">
                              {questionIndex + 1}. {question.question}
                            </h5>
                            <span className={`px-2 py-1 rounded text-xs font-medium ml-4 ${
                              question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                              question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {question.difficulty}
                            </span>
                          </div>

                          <div className="space-y-2 mb-4">
                            {question.options.map((option, optionIndex) => {
                              const optionLetter = String.fromCharCode(65 + optionIndex)
                              const isSelected = selectedAnswers[questionIndex] === optionLetter
                              const isCorrect = question.answer === optionLetter
                              const showCorrectAnswer = showAnswers || showResults
                              
                              let optionClass = "p-3 border rounded-md cursor-pointer transition-colors "
                              
                              if (!showAnswers && !showResults) {
                                optionClass += isSelected 
                                  ? "border-blue-500 bg-blue-50 text-blue-800" 
                                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                              } else if (showCorrectAnswer) {
                                if (isCorrect) {
                                  optionClass += "border-green-500 bg-green-50 text-green-800"
                                } else if (showResults && isSelected && !isCorrect) {
                                  optionClass += "border-red-500 bg-red-50 text-red-800"
                                } else {
                                  optionClass += "border-gray-300 bg-gray-50"
                                }
                              }

                              return (
                                  <div
                                    key={optionIndex}
                                    className={optionClass}
                                    onClick={() => !showAnswers && !showResults && handleAnswerSelect(questionIndex, optionLetter)}
                                  >
                                    <span className="font-medium mr-2">{optionLetter}.</span>
                                    {option.replace(/^[A-D]\.\s*/, '')}
                                    {showCorrectAnswer && isCorrect && (
                                      <span className="ml-2 text-green-600">✓</span>
                                    )}
                                    {showResults && isSelected && !isCorrect && (
                                      <span className="ml-2 text-red-600">✗</span>
                                    )}
                                  </div>
                              )
                            })}
                          </div>

                          {(showAnswers || showResults) && question.explanation && (
                            <div className="bg-gray-50 p-3 rounded-md">
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">Explanation:</span> {question.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {quizData.quiz.map((question, questionIndex) => (
              <div key={questionIndex} className="border-b border-gray-200 pb-6 last:border-b-0">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-lg font-medium text-gray-800 flex-1">
                    {questionIndex + 1}. {question.question}
                  </h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ml-4 ${
                    question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {question.difficulty}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {question.options.map((option, optionIndex) => {
                    const optionLetter = String.fromCharCode(65 + optionIndex) // A, B, C, D
                    const isSelected = selectedAnswers[questionIndex] === optionLetter
                    const isCorrect = question.answer === optionLetter
                    const showCorrectAnswer = showAnswers || showResults
                    
                    let optionClass = "p-3 border rounded-md cursor-pointer transition-colors "
                    
                    if (!showAnswers && !showResults) {
                      // Quiz mode - show selection
                      optionClass += isSelected 
                        ? "border-blue-500 bg-blue-50 text-blue-800" 
                        : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    } else if (showCorrectAnswer) {
                      // Show answers mode or results mode
                      if (isCorrect) {
                        optionClass += "border-green-500 bg-green-50 text-green-800"
                      } else if (showResults && isSelected && !isCorrect) {
                        optionClass += "border-red-500 bg-red-50 text-red-800"
                      } else {
                        optionClass += "border-gray-300 bg-gray-50"
                      }
                    }

                    return (
                      <div
                        key={optionIndex}
                        className={optionClass}
                        onClick={() => !showAnswers && !showResults && handleAnswerSelect(questionIndex, optionLetter)}
                      >
                        <span className="font-medium mr-2">{optionLetter}.</span>
                        {option.replace(/^[A-D]\.\s*/, '')}
                        {showCorrectAnswer && isCorrect && (
                          <span className="ml-2 text-green-600">✓</span>
                        )}
                        {showResults && isSelected && !isCorrect && (
                          <span className="ml-2 text-red-600">✗</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {(showAnswers || showResults) && question.explanation && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Explanation:</span> {question.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
            </div>
          )}
        </div>
      )}

      {quizData.related_topics && quizData.related_topics.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Related Topics</h3>
          <p className="text-gray-600 mb-3">Explore these related Wikipedia articles:</p>
          <div className="flex flex-wrap gap-2">
            {quizData.related_topics.map((topic, index) => (
              <a
                key={index}
                href={`https://en.wikipedia.org/wiki/${topic.replace(/\s+/g, '_')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm hover:bg-blue-200 transition-colors"
              >
                {topic} →
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default QuizDisplay