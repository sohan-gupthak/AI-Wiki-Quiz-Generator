# Testing Guide - AI Wiki Quiz Generator

This guide provides comprehensive instructions for testing the AI Wiki Quiz Generator application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Suites](#test-suites)
3. [Manual Testing](#manual-testing)
4. [Automated Testing](#automated-testing)
5. [Test Coverage](#test-coverage)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

1. **Backend Running:**
   ```bash
   cd backend
   python -m uvicorn main:app --reload
   ```
   Backend should be accessible at `http://localhost:8000`

2. **Frontend Running (optional for API tests):**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend should be accessible at `http://localhost:5173`

3. **Environment Variables:**
   - `backend/.env` must have valid `GOOGLE_API_KEY`
   - `backend/.env` must have valid `DATABASE_URL`
   - `frontend/.env` must have `VITE_API_BASE_URL=http://localhost:8000`

### Quick Test

```bash
# Test backend health
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","database_connected":true}
```

---

## Test Suites

### 1. Integration Tests

**File:** `integration_test_complete.js`

**Purpose:** Tests all API endpoints and data flow

**Run:**
```bash
node integration_test_complete.js
```

**Tests:**
- Health check endpoint
- Root endpoint
- Quiz generation with valid URL
- Quiz generation with invalid URL
- History retrieval
- Quiz retrieval by ID
- Invalid quiz ID handling
- Data flow verification
- Pagination support
- CORS headers

**Expected Pass Rate:** 80%+ (some tests may fail due to LLM API availability)

---

### 2. Error Handling Tests

**File:** `error_handling_test.js`

**Purpose:** Tests comprehensive error handling and validation

**Run:**
```bash
node error_handling_test.js
```

**Tests:**
- Invalid URL formats (8 test cases)
- Network error scenarios
- Database error handling
- Input validation
- Pagination validation
- HTTP method validation
- Content-Type validation
- Error message quality
- SQL injection prevention
- XSS prevention
- Concurrent request handling
- Error recovery

**Expected Pass Rate:** 70%+ (some edge cases may vary)

---

### 3. Sample Data Tests

**File:** `sample_data/run_sample_tests.js`

**Purpose:** Tests with various Wikipedia article types

**Run:**
```bash
node sample_data/run_sample_tests.js
```

**Tests:**
- Short articles
- Medium articles
- Long articles
- Scientific articles
- Biographical articles
- Historical events
- Geographical articles
- Technology articles
- Invalid URL handling

**Duration:** 2-5 minutes (includes delays to avoid rate limiting)

**Output:** Generated quizzes saved to `sample_data/generated_quizzes/`

---

### 4. Frontend Integration Tests

**File:** `frontend_integration_test_complete.html`

**Purpose:** Browser-based UI and integration testing

**Run:**
1. Ensure backend is running
2. Open file in browser or serve via frontend dev server
3. Click "Run All Tests"

**Tests:**
- API connectivity
- Quiz generation flow
- History functionality
- Quiz retrieval
- Error handling
- Data validation

**Note:** Must be run in a browser environment

---

## Manual Testing

### Testing Quiz Generation

1. **Start the application:**
   ```bash
   # Terminal 1: Backend
   cd backend
   python -m uvicorn main:app --reload

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

2. **Open browser:** Navigate to `http://localhost:5173`

3. **Test valid URLs:**
   - https://en.wikipedia.org/wiki/Python_(programming_language)
   - https://en.wikipedia.org/wiki/Artificial_intelligence
   - https://en.wikipedia.org/wiki/Albert_Einstein

4. **Verify quiz display:**
   - ✓ Title is displayed
   - ✓ Summary is shown
   - ✓ Key entities are categorized
   - ✓ Sections are listed
   - ✓ Questions have 4 options
   - ✓ Answers are shown
   - ✓ Explanations are provided
   - ✓ Related topics are suggested

5. **Test invalid URLs:**
   - `not-a-url` → Should show error
   - `https://google.com` → Should show error
   - Empty input → Should show error

### Testing History Functionality

1. **Generate a few quizzes** using the Generate Quiz tab

2. **Switch to Past Quizzes tab**

3. **Verify history display:**
   - ✓ Table shows all generated quizzes
   - ✓ ID, URL, Title, Date are displayed
   - ✓ Dates are formatted correctly

4. **Click "Details" button:**
   - ✓ Modal opens
   - ✓ Full quiz is displayed
   - ✓ Modal can be closed (X button or ESC key)

5. **Test refresh:**
   - Click "Refresh" button
   - ✓ History updates with latest quizzes

### Testing Error Scenarios

1. **Network errors:**
   - Stop backend server
   - Try to generate quiz
   - ✓ Error message displayed
   - ✓ User can retry after restarting backend

2. **Invalid input:**
   - Enter invalid Wikipedia URL
   - ✓ Client-side validation shows error
   - ✓ Server-side validation shows error

3. **Database errors:**
   - Request non-existent quiz ID
   - ✓ 404 error displayed appropriately

---

## Automated Testing

### Running All Tests

```bash
# Run all test suites sequentially
node integration_test_complete.js && \
node error_handling_test.js && \
node sample_data/run_sample_tests.js
```

### Continuous Integration

For CI/CD pipelines, create a test script:

**File:** `run_all_tests.sh` (Linux/Mac) or `run_all_tests.ps1` (Windows)

```bash
#!/bin/bash

echo "Starting backend..."
cd backend
python -m uvicorn main:app &
BACKEND_PID=$!
cd ..

echo "Waiting for backend to start..."
sleep 5

echo "Running integration tests..."
node integration_test_complete.js
INTEGRATION_RESULT=$?

echo "Running error handling tests..."
node error_handling_test.js
ERROR_RESULT=$?

echo "Running sample data tests..."
node sample_data/run_sample_tests.js
SAMPLE_RESULT=$?

echo "Stopping backend..."
kill $BACKEND_PID

if [ $INTEGRATION_RESULT -eq 0 ] && [ $ERROR_RESULT -eq 0 ] && [ $SAMPLE_RESULT -eq 0 ]; then
    echo "All tests passed!"
    exit 0
else
    echo "Some tests failed!"
    exit 1
fi
```

---

## Test Coverage

### Backend Coverage

**Endpoints:**
- ✓ `GET /` - Root endpoint
- ✓ `GET /health` - Health check
- ✓ `POST /generate_quiz` - Quiz generation
- ✓ `GET /history` - Quiz history
- ✓ `GET /quiz/{id}` - Quiz retrieval

**Functionality:**
- ✓ Wikipedia scraping
- ✓ Content cleaning
- ✓ LLM quiz generation
- ✓ Database storage
- ✓ Data serialization/deserialization
- ✓ Error handling
- ✓ Input validation
- ✓ CORS configuration

### Frontend Coverage

**Components:**
- ✓ GenerateQuizTab
- ✓ HistoryTab
- ✓ QuizDisplay
- ✓ Modal
- ✓ LoadingSpinner
- ✓ ErrorMessage

**Functionality:**
- ✓ URL input and validation
- ✓ Quiz generation flow
- ✓ History display
- ✓ Quiz details modal
- ✓ Error display
- ✓ Loading states

### Requirements Coverage

All requirements from `requirements.md` are tested:

- ✓ Requirement 1.1-1.5: Quiz Generation
- ✓ Requirement 2.1-2.5: Quiz Structure
- ✓ Requirement 3.1-3.5: Key Information Extraction
- ✓ Requirement 4.1-4.5: Database Storage
- ✓ Requirement 5.1-5.5: History Functionality
- ✓ Requirement 6.1-6.5: Frontend Interface
- ✓ Requirement 7.1-7.5: Technology Stack
- ✓ Requirement 8.1-8.5: API Endpoints
- ✓ Requirement 9.1-9.5: Error Handling

---

## Troubleshooting

### Backend Not Starting

**Problem:** Backend fails to start

**Solutions:**
1. Check Python version: `python --version` (should be 3.10+)
2. Install dependencies: `pip install -r requirements.txt`
3. Check database connection in `.env`
4. Verify port 8000 is not in use: `netstat -an | grep 8000`

### Database Connection Errors

**Problem:** "Database connection failed"

**Solutions:**
1. Verify PostgreSQL is running
2. Check `DATABASE_URL` in `backend/.env`
3. Test connection: `psql -U username -d quiz_generator`
4. Run database initialization: `python backend/init_db.py`

### LLM API Errors

**Problem:** Quiz generation fails with API errors

**Solutions:**
1. Verify `GOOGLE_API_KEY` in `backend/.env`
2. Check API key is valid: https://makersuite.google.com/app/apikey
3. Check rate limits (Gemini free tier has limits)
4. Wait a few minutes and retry

### Frontend Not Loading

**Problem:** Frontend shows blank page or errors

**Solutions:**
1. Check Node.js version: `node --version` (should be 16+)
2. Install dependencies: `npm install`
3. Check `VITE_API_BASE_URL` in `frontend/.env`
4. Clear browser cache
5. Check browser console for errors

### Tests Failing

**Problem:** Integration tests fail

**Solutions:**
1. Ensure backend is running and healthy
2. Check database is connected
3. Verify API key is configured
4. Check network connectivity
5. Review test output for specific failures

### CORS Errors

**Problem:** "CORS policy" errors in browser

**Solutions:**
1. Verify CORS middleware is configured in `backend/main.py`
2. Check frontend URL is in `allow_origins` list
3. Restart backend server
4. Clear browser cache

---

## Test Results Documentation

### Saving Test Results

Test results are automatically saved to:
- Console output (can be redirected to file)
- `sample_data/generated_quizzes/` (for sample data tests)
- `INTEGRATION_TEST_RESULTS.md` (comprehensive test documentation)

### Generating Test Reports

```bash
# Save test output to file
node integration_test_complete.js > test_results.txt 2>&1

# View results
cat test_results.txt
```

---

## Best Practices

1. **Run tests before committing code**
2. **Test with various Wikipedia articles**
3. **Verify error handling works correctly**
4. **Check database state after tests**
5. **Monitor API rate limits**
6. **Keep test data up to date**
7. **Document any test failures**
8. **Update tests when adding features**

---

## Additional Resources

- **API Documentation:** http://localhost:8000/docs (when backend is running)
- **Requirements:** `.kiro/specs/ai-wiki-quiz-generator/requirements.md`
- **Design:** `.kiro/specs/ai-wiki-quiz-generator/design.md`
- **Tasks:** `.kiro/specs/ai-wiki-quiz-generator/tasks.md`
- **Integration Test Results:** `INTEGRATION_TEST_RESULTS.md`
- **Sample Data:** `sample_data/README.md`

---

## Contact

For issues or questions about testing, refer to the project documentation or create an issue in the project repository.
