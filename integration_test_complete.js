/**
 * Comprehensive Integration Test for AI Wiki Quiz Generator
 * 
 * This script tests:
 * 1. All API endpoints (health, generate_quiz, history, quiz/{id})
 * 2. Data flow from URL input to quiz display
 * 3. History functionality and modal display
 * 4. Error handling scenarios
 */

const API_BASE_URL = 'http://localhost:8000';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
};

/**
 * Log test result
 */
function logTest(testName, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`${colors.green}✓${colors.reset} ${testName}`);
    if (message) console.log(`  ${colors.cyan}${message}${colors.reset}`);
  } else {
    testResults.failed++;
    console.log(`${colors.red}✗${colors.reset} ${testName}`);
    if (message) console.log(`  ${colors.red}${message}${colors.reset}`);
  }
}

/**
 * Log section header
 */
function logSection(title) {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * Make API request
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return { response, data, ok: response.ok };
  } catch (error) {
    return { error: error.message, ok: false };
  }
}

/**
 * Test 1: Health Check Endpoint
 */
async function testHealthCheck() {
  logSection('Test 1: Health Check Endpoint');
  
  const { response, data, ok, error } = await apiRequest('/health');
  
  if (error) {
    logTest('Health check endpoint accessible', false, `Error: ${error}`);
    return false;
  }
  
  logTest('Health check endpoint accessible', ok);
  logTest('Health check returns status', data && data.status !== undefined, 
    data ? `Status: ${data.status}` : '');
  logTest('Database connection verified', data && data.database_connected === true,
    data ? `Database connected: ${data.database_connected}` : '');
  
  return ok && data && data.database_connected;
}

/**
 * Test 2: Root Endpoint
 */
async function testRootEndpoint() {
  logSection('Test 2: Root Endpoint');
  
  const { response, data, ok, error } = await apiRequest('/');
  
  if (error) {
    logTest('Root endpoint accessible', false, `Error: ${error}`);
    return false;
  }
  
  logTest('Root endpoint accessible', ok);
  logTest('Root endpoint returns API info', data && data.message !== undefined,
    data ? `Message: ${data.message}` : '');
  
  return ok;
}

/**
 * Test 3: Generate Quiz - Valid Wikipedia URL
 */
async function testGenerateQuizValid() {
  logSection('Test 3: Generate Quiz - Valid Wikipedia URL');
  
  const testUrl = 'https://en.wikipedia.org/wiki/Artificial_intelligence';
  console.log(`Testing with URL: ${testUrl}\n`);
  
  const { response, data, ok, error } = await apiRequest('/generate_quiz', {
    method: 'POST',
    body: JSON.stringify({ url: testUrl }),
  });
  
  if (error) {
    logTest('Quiz generation request sent', false, `Error: ${error}`);
    return null;
  }
  
  logTest('Quiz generation request sent', ok);
  
  if (!ok) {
    logTest('Quiz generation successful', false, 
      data && data.detail ? `Error: ${data.detail}` : 'Unknown error');
    return null;
  }
  
  // Validate response structure
  logTest('Response contains ID', data && data.id !== undefined,
    data ? `ID: ${data.id}` : '');
  logTest('Response contains URL', data && data.url === testUrl);
  logTest('Response contains title', data && data.title && data.title.length > 0,
    data ? `Title: ${data.title}` : '');
  logTest('Response contains summary', data && data.summary && data.summary.length > 0,
    data ? `Summary length: ${data.summary.length} chars` : '');
  logTest('Response contains key_entities', data && data.key_entities !== undefined);
  logTest('Response contains sections', data && Array.isArray(data.sections),
    data && data.sections ? `Sections: ${data.sections.length}` : '');
  logTest('Response contains quiz questions', data && Array.isArray(data.quiz),
    data && data.quiz ? `Questions: ${data.quiz.length}` : '');
  logTest('Response contains related_topics', data && Array.isArray(data.related_topics),
    data && data.related_topics ? `Related topics: ${data.related_topics.length}` : '');
  
  // Validate quiz questions structure
  if (data && data.quiz && data.quiz.length > 0) {
    const firstQuestion = data.quiz[0];
    logTest('Quiz question has required fields', 
      firstQuestion.question && 
      Array.isArray(firstQuestion.options) && 
      firstQuestion.options.length === 4 &&
      firstQuestion.answer &&
      firstQuestion.difficulty &&
      firstQuestion.explanation,
      `First question: "${firstQuestion.question.substring(0, 50)}..."`);
  }
  
  // Validate key entities structure
  if (data && data.key_entities) {
    logTest('Key entities has required categories',
      Array.isArray(data.key_entities.people) &&
      Array.isArray(data.key_entities.organizations) &&
      Array.isArray(data.key_entities.locations),
      `People: ${data.key_entities.people?.length || 0}, ` +
      `Organizations: ${data.key_entities.organizations?.length || 0}, ` +
      `Locations: ${data.key_entities.locations?.length || 0}`);
  }
  
  return data;
}

/**
 * Test 4: Generate Quiz - Invalid URL
 */
async function testGenerateQuizInvalid() {
  logSection('Test 4: Generate Quiz - Invalid URL');
  
  const testUrl = 'https://invalid-url.com/not-wikipedia';
  console.log(`Testing with invalid URL: ${testUrl}\n`);
  
  const { response, data, ok, error } = await apiRequest('/generate_quiz', {
    method: 'POST',
    body: JSON.stringify({ url: testUrl }),
  });
  
  logTest('Invalid URL rejected', !ok && response && response.status === 400,
    data && data.detail ? `Error message: ${data.detail}` : '');
  logTest('Error message provided', data && data.detail && data.detail.length > 0);
  
  return !ok;
}

/**
 * Test 5: Get Quiz History
 */
async function testGetHistory() {
  logSection('Test 5: Get Quiz History');
  
  const { response, data, ok, error } = await apiRequest('/history');
  
  if (error) {
    logTest('History endpoint accessible', false, `Error: ${error}`);
    return null;
  }
  
  logTest('History endpoint accessible', ok);
  logTest('History returns array', Array.isArray(data),
    data ? `History count: ${data.length}` : '');
  
  if (data && data.length > 0) {
    const firstQuiz = data[0];
    logTest('History items have required fields',
      firstQuiz.id !== undefined &&
      firstQuiz.url !== undefined &&
      firstQuiz.title !== undefined &&
      firstQuiz.date_generated !== undefined,
      `First quiz: ID=${firstQuiz.id}, Title="${firstQuiz.title}"`);
    
    // Validate date format
    const dateValid = !isNaN(Date.parse(firstQuiz.date_generated));
    logTest('Date format is valid', dateValid,
      `Date: ${firstQuiz.date_generated}`);
  } else {
    console.log(`  ${colors.yellow}Note: No quiz history found. Generate a quiz first.${colors.reset}`);
  }
  
  return data;
}

/**
 * Test 6: Get Quiz by ID
 */
async function testGetQuizById(quizId) {
  logSection('Test 6: Get Quiz by ID');
  
  if (!quizId) {
    console.log(`  ${colors.yellow}Skipping: No quiz ID available${colors.reset}`);
    return null;
  }
  
  console.log(`Testing with quiz ID: ${quizId}\n`);
  
  const { response, data, ok, error } = await apiRequest(`/quiz/${quizId}`);
  
  if (error) {
    logTest('Quiz retrieval by ID', false, `Error: ${error}`);
    return null;
  }
  
  logTest('Quiz retrieval by ID', ok);
  logTest('Retrieved quiz has complete data', 
    data && data.id === quizId &&
    data.title && data.summary && data.quiz && data.key_entities,
    data ? `Title: ${data.title}` : '');
  logTest('Quiz data structure matches generation response',
    data && data.id && data.url && data.title && data.summary &&
    data.key_entities && data.sections && data.quiz && data.related_topics);
  
  return data;
}

/**
 * Test 7: Get Quiz by Invalid ID
 */
async function testGetQuizByInvalidId() {
  logSection('Test 7: Get Quiz by Invalid ID');
  
  const invalidId = 999999;
  console.log(`Testing with invalid quiz ID: ${invalidId}\n`);
  
  const { response, data, ok, error } = await apiRequest(`/quiz/${invalidId}`);
  
  logTest('Invalid quiz ID returns 404', !ok && response && response.status === 404,
    data && data.detail ? `Error message: ${data.detail}` : '');
  logTest('Error message provided', data && data.detail && data.detail.length > 0);
  
  return !ok;
}

/**
 * Test 8: Data Flow Verification
 */
async function testDataFlow(generatedQuiz, retrievedQuiz) {
  logSection('Test 8: Data Flow Verification');
  
  if (!generatedQuiz || !retrievedQuiz) {
    console.log(`  ${colors.yellow}Skipping: Missing quiz data${colors.reset}`);
    return false;
  }
  
  logTest('Generated and retrieved quiz IDs match',
    generatedQuiz.id === retrievedQuiz.id,
    `Generated ID: ${generatedQuiz.id}, Retrieved ID: ${retrievedQuiz.id}`);
  logTest('Quiz titles match', generatedQuiz.title === retrievedQuiz.title);
  logTest('Quiz URLs match', generatedQuiz.url === retrievedQuiz.url);
  logTest('Quiz summaries match', generatedQuiz.summary === retrievedQuiz.summary);
  logTest('Number of questions match',
    generatedQuiz.quiz.length === retrievedQuiz.quiz.length,
    `Questions: ${generatedQuiz.quiz.length}`);
  logTest('Number of sections match',
    generatedQuiz.sections.length === retrievedQuiz.sections.length,
    `Sections: ${generatedQuiz.sections.length}`);
  logTest('Number of related topics match',
    generatedQuiz.related_topics.length === retrievedQuiz.related_topics.length,
    `Related topics: ${generatedQuiz.related_topics.length}`);
  
  return true;
}

/**
 * Test 9: Pagination Support
 */
async function testPagination() {
  logSection('Test 9: Pagination Support');
  
  // Test with limit parameter
  const { response: resp1, data: data1, ok: ok1 } = await apiRequest('/history?limit=2');
  logTest('History endpoint accepts limit parameter', ok1);
  logTest('Limit parameter works correctly',
    Array.isArray(data1) && data1.length <= 2,
    data1 ? `Returned ${data1.length} items` : '');
  
  // Test with skip parameter
  const { response: resp2, data: data2, ok: ok2 } = await apiRequest('/history?skip=1&limit=1');
  logTest('History endpoint accepts skip parameter', ok2);
  
  // Test invalid pagination parameters
  const { response: resp3, data: data3, ok: ok3 } = await apiRequest('/history?limit=0');
  logTest('Invalid limit parameter rejected', !ok3 && resp3 && resp3.status === 400);
  
  const { response: resp4, data: data4, ok: ok4 } = await apiRequest('/history?skip=-1');
  logTest('Negative skip parameter rejected', !ok4 && resp4 && resp4.status === 400);
  
  return ok1 && ok2;
}

/**
 * Test 10: CORS Headers
 */
async function testCORS() {
  logSection('Test 10: CORS Headers');
  
  const { response, ok } = await apiRequest('/health', {
    method: 'OPTIONS',
  });
  
  if (!response) {
    logTest('CORS preflight request', false, 'No response received');
    return false;
  }
  
  const corsHeaders = {
    'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
    'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
    'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
  };
  
  logTest('CORS headers present', 
    corsHeaders['access-control-allow-origin'] !== null,
    `Allow-Origin: ${corsHeaders['access-control-allow-origin']}`);
  
  return corsHeaders['access-control-allow-origin'] !== null;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`\n${colors.cyan}${'='.repeat(60)}`);
  console.log('AI Wiki Quiz Generator - Integration Tests');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`Testing API at: ${colors.yellow}${API_BASE_URL}${colors.reset}\n`);
  
  let generatedQuiz = null;
  let historyData = null;
  let retrievedQuiz = null;
  
  try {
    // Run tests sequentially
    const healthOk = await testHealthCheck();
    
    if (!healthOk) {
      console.log(`\n${colors.red}Backend is not healthy. Stopping tests.${colors.reset}\n`);
      return;
    }
    
    await testRootEndpoint();
    generatedQuiz = await testGenerateQuizValid();
    await testGenerateQuizInvalid();
    historyData = await testGetHistory();
    
    // Use the generated quiz ID or the first from history
    const quizId = generatedQuiz?.id || (historyData && historyData.length > 0 ? historyData[0].id : null);
    retrievedQuiz = await testGetQuizById(quizId);
    
    await testGetQuizByInvalidId();
    await testDataFlow(generatedQuiz, retrievedQuiz);
    await testPagination();
    await testCORS();
    
  } catch (error) {
    console.error(`\n${colors.red}Test execution error: ${error.message}${colors.reset}`);
    console.error(error.stack);
  }
  
  // Print summary
  logSection('Test Summary');
  console.log(`Total tests: ${testResults.total}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  
  const passRate = testResults.total > 0 
    ? ((testResults.passed / testResults.total) * 100).toFixed(1) 
    : 0;
  console.log(`Pass rate: ${passRate}%\n`);
  
  if (testResults.failed === 0) {
    console.log(`${colors.green}✓ All tests passed!${colors.reset}\n`);
  } else {
    console.log(`${colors.red}✗ Some tests failed. Please review the output above.${colors.reset}\n`);
  }
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
