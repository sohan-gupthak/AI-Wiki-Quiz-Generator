/**
 * Sample Data Test Runner
 * 
 * This script tests the quiz generator with various Wikipedia articles
 * to verify it works correctly with different article types and lengths.
 */

const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:8000';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: [],
};

function logTest(testName, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`${colors.green}✓${colors.reset} ${testName}`);
  } else {
    testResults.failed++;
    console.log(`${colors.red}✗${colors.reset} ${testName}`);
  }
  if (message) console.log(`  ${colors.cyan}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}\n`);
}

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

    return { response, data, ok: response.ok, status: response.status };
  } catch (error) {
    return { error: error.message, ok: false, status: 0 };
  }
}

function validateQuizStructure(quizData, expectedCharacteristics) {
  const validations = [];

  // Check basic structure
  validations.push({
    name: 'Has ID',
    passed: quizData.id !== undefined,
    value: quizData.id,
  });

  validations.push({
    name: 'Has URL',
    passed: quizData.url !== undefined && quizData.url.length > 0,
    value: quizData.url,
  });

  validations.push({
    name: 'Has title',
    passed: quizData.title !== undefined && quizData.title.length > 0,
    value: quizData.title,
  });

  validations.push({
    name: 'Has summary',
    passed: quizData.summary !== undefined && quizData.summary.length > 0,
    value: `${quizData.summary?.length || 0} chars`,
  });

  // Check quiz questions
  const questionCount = quizData.quiz?.length || 0;
  validations.push({
    name: 'Has quiz questions',
    passed: questionCount >= expectedCharacteristics.min_questions &&
            questionCount <= expectedCharacteristics.max_questions,
    value: `${questionCount} questions`,
  });

  // Check question structure
  if (quizData.quiz && quizData.quiz.length > 0) {
    const firstQuestion = quizData.quiz[0];
    validations.push({
      name: 'Question has required fields',
      passed: firstQuestion.question && 
              Array.isArray(firstQuestion.options) &&
              firstQuestion.options.length === 4 &&
              firstQuestion.answer &&
              firstQuestion.difficulty &&
              firstQuestion.explanation,
      value: 'All fields present',
    });

    // Check difficulty levels
    const difficulties = quizData.quiz.map(q => q.difficulty);
    const validDifficulties = difficulties.every(d => ['easy', 'medium', 'hard'].includes(d));
    validations.push({
      name: 'Valid difficulty levels',
      passed: validDifficulties,
      value: `${difficulties.filter((v, i, a) => a.indexOf(v) === i).join(', ')}`,
    });
  }

  // Check key entities
  if (expectedCharacteristics.has_key_entities) {
    validations.push({
      name: 'Has key entities',
      passed: quizData.key_entities !== undefined &&
              Array.isArray(quizData.key_entities.people) &&
              Array.isArray(quizData.key_entities.organizations) &&
              Array.isArray(quizData.key_entities.locations),
      value: `People: ${quizData.key_entities?.people?.length || 0}, ` +
             `Orgs: ${quizData.key_entities?.organizations?.length || 0}, ` +
             `Locations: ${quizData.key_entities?.locations?.length || 0}`,
    });
  }

  // Check sections
  if (expectedCharacteristics.has_sections) {
    validations.push({
      name: 'Has sections',
      passed: Array.isArray(quizData.sections) && quizData.sections.length > 0,
      value: `${quizData.sections?.length || 0} sections`,
    });
  }

  // Check related topics
  if (expectedCharacteristics.has_related_topics) {
    validations.push({
      name: 'Has related topics',
      passed: Array.isArray(quizData.related_topics) && quizData.related_topics.length > 0,
      value: `${quizData.related_topics?.length || 0} topics`,
    });
  }

  return validations;
}

async function testValidCase(testCase) {
  logSection(`Test: ${testCase.name}`);
  console.log(`${colors.cyan}URL: ${testCase.url}${colors.reset}`);
  console.log(`${colors.cyan}Description: ${testCase.description}${colors.reset}\n`);

  const startTime = Date.now();
  const { response, data, ok, error } = await apiRequest('/generate_quiz', {
    method: 'POST',
    body: JSON.stringify({ url: testCase.url }),
  });
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  if (error) {
    logTest('Quiz generation request', false, `Error: ${error}`);
    testResults.details.push({
      testCase: testCase.name,
      success: false,
      error: error,
    });
    return;
  }

  logTest('Quiz generation request', ok, `Completed in ${duration}s`);

  if (!ok) {
    logTest('Quiz generated successfully', false, data?.detail || 'Unknown error');
    testResults.details.push({
      testCase: testCase.name,
      success: false,
      error: data?.detail || 'Unknown error',
    });
    return;
  }

  // Validate quiz structure
  const validations = validateQuizStructure(data, testCase.expected_characteristics);
  
  for (const validation of validations) {
    logTest(validation.name, validation.passed, validation.value);
  }

  // Save quiz data to file
  const outputDir = path.join(__dirname, 'generated_quizzes');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `${testCase.id}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
  console.log(`\n${colors.magenta}Quiz saved to: ${outputFile}${colors.reset}`);

  testResults.details.push({
    testCase: testCase.name,
    success: ok && validations.every(v => v.passed),
    quizId: data.id,
    questionCount: data.quiz?.length || 0,
    duration: duration,
  });
}

async function testInvalidCase(testCase) {
  logSection(`Test: ${testCase.name} (Invalid)`);
  console.log(`${colors.cyan}URL: ${testCase.url}${colors.reset}`);
  console.log(`${colors.cyan}Expected Error: ${testCase.expected_error}${colors.reset}\n`);

  const { response, data, ok, error } = await apiRequest('/generate_quiz', {
    method: 'POST',
    body: JSON.stringify({ url: testCase.url }),
  });

  logTest('Request rejected', !ok, data?.detail || error || 'Error occurred');
  
  const errorMessage = data?.detail || error || '';
  const expectedError = testCase.expected_error.toLowerCase();
  const actualError = errorMessage.toLowerCase();
  const errorMatches = actualError.includes(expectedError) || 
                       expectedError.includes(actualError.split(':')[0]);

  logTest('Error message matches expected', errorMatches, 
    `Expected: "${testCase.expected_error}", Got: "${errorMessage}"`);
}

async function runTests() {
  console.log(`\n${colors.cyan}${'='.repeat(70)}`);
  console.log('Sample Data Test Runner');
  console.log('AI Wiki Quiz Generator - Testing with Various Article Types');
  console.log(`${'='.repeat(70)}${colors.reset}\n`);

  console.log(`Testing API at: ${colors.yellow}${API_BASE_URL}${colors.reset}\n`);

  // Load test cases
  const testDataPath = path.join(__dirname, 'test_urls.json');
  const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

  // Check backend health
  logSection('Backend Health Check');
  const { data: healthData, ok: healthOk } = await apiRequest('/health');
  
  if (!healthOk || !healthData?.database_connected) {
    console.log(`${colors.red}Backend is not healthy. Cannot proceed with tests.${colors.reset}\n`);
    return;
  }

  logTest('Backend is healthy', true, `Status: ${healthData.status}`);
  logTest('Database connected', true);

  // Run valid test cases
  console.log(`\n${colors.yellow}Running ${testData.test_cases.length} valid test cases...${colors.reset}`);
  
  for (const testCase of testData.test_cases) {
    await testValidCase(testCase);
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Run invalid test cases
  console.log(`\n${colors.yellow}Running ${testData.invalid_test_cases.length} invalid test cases...${colors.reset}`);
  
  for (const testCase of testData.invalid_test_cases) {
    await testInvalidCase(testCase);
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

  // Print detailed results
  console.log(`${colors.cyan}Detailed Results:${colors.reset}\n`);
  for (const detail of testResults.details) {
    const status = detail.success ? colors.green + '✓' : colors.red + '✗';
    console.log(`${status} ${detail.testCase}${colors.reset}`);
    if (detail.quizId) {
      console.log(`  Quiz ID: ${detail.quizId}, Questions: ${detail.questionCount}, Duration: ${detail.duration}s`);
    }
    if (detail.error) {
      console.log(`  ${colors.red}Error: ${detail.error}${colors.reset}`);
    }
  }

  console.log();

  if (testResults.failed === 0) {
    console.log(`${colors.green}✓ All sample data tests passed!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠ Some tests failed. Review the output above.${colors.reset}\n`);
  }

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  console.error(error.stack);
  process.exit(1);
});
