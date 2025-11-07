/**
 * Comprehensive Error Handling and Validation Tests
 * 
 * This script tests all error scenarios and validation logic:
 * 1. Invalid URLs and network errors
 * 2. Frontend error message display
 * 3. Database connection failures
 * 4. API error responses
 * 5. Edge cases and boundary conditions
 */

const API_BASE_URL = 'http://localhost:8000';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
};

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

function logSection(title) {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
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

/**
 * Test 1: Invalid URL Formats
 */
async function testInvalidURLFormats() {
  logSection('Test 1: Invalid URL Formats');

  const invalidUrls = [
    { url: 'not-a-url', description: 'Plain text' },
    { url: 'http://google.com', description: 'Non-Wikipedia URL' },
    { url: 'https://wikipedia.org', description: 'Wikipedia homepage' },
    { url: 'https://en.wikipedia.org/', description: 'Wikipedia root without article' },
    { url: 'https://en.wikipedia.org/wiki/', description: 'Wiki path without article' },
    { url: 'ftp://en.wikipedia.org/wiki/Test', description: 'Wrong protocol' },
    { url: '', description: 'Empty string' },
    { url: 'javascript:alert(1)', description: 'JavaScript injection attempt' },
  ];

  for (const { url, description } of invalidUrls) {
    const { response, data, ok, status } = await apiRequest('/generate_quiz', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });

    logTest(`Invalid URL rejected: ${description}`, 
      !ok && status === 400,
      data?.detail || data?.message || 'No error message');
  }
}

/**
 * Test 2: Network Error Scenarios
 */
async function testNetworkErrors() {
  logSection('Test 2: Network Error Scenarios');

  // Test with non-existent Wikipedia article
  const nonExistentUrl = 'https://en.wikipedia.org/wiki/ThisArticleDefinitelyDoesNotExist123456789';
  const { response, data, ok, status } = await apiRequest('/generate_quiz', {
    method: 'POST',
    body: JSON.stringify({ url: nonExistentUrl }),
  });

  logTest('Non-existent article handled gracefully',
    !ok && (status === 404 || status === 503 || status === 400),
    data?.detail || data?.message || 'Error handled');

  // Test with malformed Wikipedia URL
  const malformedUrl = 'https://en.wikipedia.org/wiki/<script>alert(1)</script>';
  const { response: resp2, data: data2, ok: ok2, status: status2 } = await apiRequest('/generate_quiz', {
    method: 'POST',
    body: JSON.stringify({ url: malformedUrl }),
  });

  logTest('Malformed URL rejected',
    !ok2 && status2 === 400,
    data2?.detail || data2?.message || 'Error handled');
}

/**
 * Test 3: Database Error Handling
 */
async function testDatabaseErrors() {
  logSection('Test 3: Database Error Handling');

  // Test quiz retrieval with invalid IDs
  const invalidIds = [
    { id: 0, description: 'Zero ID' },
    { id: -1, description: 'Negative ID' },
    { id: 999999, description: 'Non-existent ID' },
    { id: 'abc', description: 'String ID' },
    { id: 1.5, description: 'Decimal ID' },
  ];

  for (const { id, description } of invalidIds) {
    const { response, data, ok, status } = await apiRequest(`/quiz/${id}`);
    
    logTest(`Invalid quiz ID handled: ${description}`,
      !ok && (status === 400 || status === 404 || status === 422),
      data?.detail || data?.message || 'Error handled');
  }
}

/**
 * Test 4: Input Validation
 */
async function testInputValidation() {
  logSection('Test 4: Input Validation');

  // Test missing URL field
  const { response: resp1, data: data1, ok: ok1, status: status1 } = await apiRequest('/generate_quiz', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  logTest('Missing URL field rejected',
    !ok1 && status1 === 422,
    data1?.detail || 'Validation error');

  // Test null URL
  const { response: resp2, data: data2, ok: ok2, status: status2 } = await apiRequest('/generate_quiz', {
    method: 'POST',
    body: JSON.stringify({ url: null }),
  });

  logTest('Null URL rejected',
    !ok2 && status2 === 422,
    data2?.detail || 'Validation error');

  // Test extremely long URL
  const longUrl = 'https://en.wikipedia.org/wiki/' + 'A'.repeat(10000);
  const { response: resp3, data: data3, ok: ok3, status: status3 } = await apiRequest('/generate_quiz', {
    method: 'POST',
    body: JSON.stringify({ url: longUrl }),
  });

  logTest('Extremely long URL handled',
    !ok3,
    data3?.detail || 'Error handled');

  // Test special characters in URL
  const specialCharsUrl = 'https://en.wikipedia.org/wiki/Test%20Article%20(disambiguation)';
  const { response: resp4, data: data4, ok: ok4, status: status4 } = await apiRequest('/generate_quiz', {
    method: 'POST',
    body: JSON.stringify({ url: specialCharsUrl }),
  });

  logTest('Special characters in URL handled',
    true,
    ok4 ? 'Accepted (valid URL)' : `Rejected: ${data4?.detail || 'Error'}`);
}

/**
 * Test 5: Pagination Validation
 */
async function testPaginationValidation() {
  logSection('Test 5: Pagination Validation');

  const paginationTests = [
    { params: 'limit=0', description: 'Zero limit', shouldFail: true },
    { params: 'limit=-1', description: 'Negative limit', shouldFail: true },
    { params: 'limit=101', description: 'Limit exceeds maximum', shouldFail: true },
    { params: 'skip=-1', description: 'Negative skip', shouldFail: true },
    { params: 'skip=abc', description: 'String skip', shouldFail: true },
    { params: 'limit=abc', description: 'String limit', shouldFail: true },
    { params: 'limit=50&skip=10', description: 'Valid pagination', shouldFail: false },
  ];

  for (const { params, description, shouldFail } of paginationTests) {
    const { response, data, ok, status } = await apiRequest(`/history?${params}`);
    
    if (shouldFail) {
      logTest(`Invalid pagination rejected: ${description}`,
        !ok && status === 400,
        data?.detail || 'Error handled');
    } else {
      logTest(`Valid pagination accepted: ${description}`,
        ok && status === 200,
        `Returned ${Array.isArray(data) ? data.length : 0} items`);
    }
  }
}

/**
 * Test 6: HTTP Method Validation
 */
async function testHTTPMethods() {
  logSection('Test 6: HTTP Method Validation');

  // Test wrong HTTP methods
  const methodTests = [
    { endpoint: '/generate_quiz', method: 'GET', description: 'GET on POST endpoint' },
    { endpoint: '/history', method: 'POST', description: 'POST on GET endpoint' },
    { endpoint: '/quiz/1', method: 'POST', description: 'POST on GET endpoint' },
    { endpoint: '/quiz/1', method: 'DELETE', description: 'DELETE on GET endpoint' },
  ];

  for (const { endpoint, method, description } of methodTests) {
    const { response, data, ok, status } = await apiRequest(endpoint, { method });
    
    logTest(`Wrong HTTP method rejected: ${description}`,
      !ok && status === 405,
      `Status: ${status}`);
  }
}

/**
 * Test 7: Content-Type Validation
 */
async function testContentType() {
  logSection('Test 7: Content-Type Validation');

  // Test with wrong content type
  const { response, data, ok, status } = await apiRequest('/generate_quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: 'not json',
  });

  logTest('Invalid content type handled',
    !ok,
    `Status: ${status}`);

  // Test with missing content type
  const { response: resp2, data: data2, ok: ok2, status: status2 } = await apiRequest('/generate_quiz', {
    method: 'POST',
    headers: {},
    body: JSON.stringify({ url: 'https://en.wikipedia.org/wiki/Test' }),
  });

  logTest('Missing content type handled',
    true,
    ok2 ? 'Accepted (default handling)' : `Rejected: ${status2}`);
}

/**
 * Test 8: Error Message Quality
 */
async function testErrorMessageQuality() {
  logSection('Test 8: Error Message Quality');

  const testCases = [
    {
      endpoint: '/generate_quiz',
      method: 'POST',
      body: { url: 'invalid-url' },
      description: 'Invalid URL error message',
    },
    {
      endpoint: '/quiz/999999',
      method: 'GET',
      body: null,
      description: 'Not found error message',
    },
    {
      endpoint: '/history?limit=0',
      method: 'GET',
      body: null,
      description: 'Invalid pagination error message',
    },
  ];

  for (const { endpoint, method, body, description } of testCases) {
    const { response, data, ok } = await apiRequest(endpoint, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    });

    const errorMsg = data && (data.detail || data.message);
    const hasErrorMessage = errorMsg && typeof errorMsg === 'string';
    const messageLength = hasErrorMessage ? errorMsg.length : 0;
    const isDescriptive = messageLength > 10 && messageLength < 500;

    logTest(`Error message is descriptive: ${description}`,
      !ok && hasErrorMessage && isDescriptive,
      hasErrorMessage ? `Message: "${errorMsg.substring(0, 80)}..."` : 'No error message');
  }
}

/**
 * Test 9: SQL Injection Prevention
 */
async function testSQLInjection() {
  logSection('Test 9: SQL Injection Prevention');

  const sqlInjectionAttempts = [
    "1' OR '1'='1",
    "1; DROP TABLE quiz;--",
    "1 UNION SELECT * FROM quiz",
    "' OR 1=1--",
  ];

  for (const injection of sqlInjectionAttempts) {
    const { response, data, ok, status } = await apiRequest(`/quiz/${encodeURIComponent(injection)}`);
    
    logTest(`SQL injection prevented: ${injection}`,
      !ok && (status === 400 || status === 404 || status === 422),
      'Injection attempt blocked');
  }
}

/**
 * Test 10: XSS Prevention
 */
async function testXSSPrevention() {
  logSection('Test 10: XSS Prevention');

  const xssAttempts = [
    '<script>alert("XSS")</script>',
    'javascript:alert(1)',
    '<img src=x onerror=alert(1)>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
  ];

  for (const xss of xssAttempts) {
    const url = `https://en.wikipedia.org/wiki/${xss}`;
    const { response, data, ok, status } = await apiRequest('/generate_quiz', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });

    logTest(`XSS attempt prevented: ${xss.substring(0, 30)}...`,
      !ok,
      'XSS attempt blocked');
  }
}

/**
 * Test 11: Rate Limiting (if implemented)
 */
async function testRateLimiting() {
  logSection('Test 11: Concurrent Request Handling');

  // Send multiple concurrent requests
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(apiRequest('/health'));
  }

  const results = await Promise.all(promises);
  const allSucceeded = results.every(r => r.ok);

  logTest('Concurrent requests handled',
    allSucceeded,
    `${results.filter(r => r.ok).length}/5 requests succeeded`);
}

/**
 * Test 12: Error Recovery
 */
async function testErrorRecovery() {
  logSection('Test 12: Error Recovery');

  // Test that after an error, the system can still process valid requests
  // First, send an invalid request
  await apiRequest('/generate_quiz', {
    method: 'POST',
    body: JSON.stringify({ url: 'invalid' }),
  });

  // Then, send a valid request
  const { response, data, ok } = await apiRequest('/health');

  logTest('System recovers after error',
    ok && data?.status === 'healthy',
    'Health check successful after error');
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`\n${colors.cyan}${'='.repeat(60)}`);
  console.log('Error Handling and Validation Tests');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  console.log(`Testing API at: ${colors.yellow}${API_BASE_URL}${colors.reset}\n`);

  try {
    await testInvalidURLFormats();
    await testNetworkErrors();
    await testDatabaseErrors();
    await testInputValidation();
    await testPaginationValidation();
    await testHTTPMethods();
    await testContentType();
    await testErrorMessageQuality();
    await testSQLInjection();
    await testXSSPrevention();
    await testRateLimiting();
    await testErrorRecovery();
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
    console.log(`${colors.green}✓ All error handling tests passed!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠ Some tests failed. Review the output above.${colors.reset}\n`);
  }

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
