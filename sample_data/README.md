# Sample Data and Test Cases

This directory contains sample test cases and test runners for the AI Wiki Quiz Generator.

## Contents

### Test Data Files

- **test_urls.json** - Collection of Wikipedia URLs for testing different article types
  - Short articles (e.g., Haiku)
  - Medium articles (e.g., Python programming language)
  - Long articles (e.g., World War II)
  - Scientific articles (e.g., Photosynthesis)
  - Biographical articles (e.g., Albert Einstein)
  - Historical events (e.g., Moon landing)
  - Geographical articles (e.g., Mount Everest)
  - Technology articles (e.g., Artificial Intelligence)
  - Invalid test cases for error handling

### Test Runners

- **run_sample_tests.js** - Automated test runner that:
  - Tests quiz generation with various article types
  - Validates quiz structure and content
  - Saves generated quizzes to `generated_quizzes/` directory
  - Tests error handling with invalid URLs
  - Generates detailed test reports

### Generated Quizzes Directory

- **generated_quizzes/** - Contains JSON files of generated quizzes
  - Each quiz is saved with its test case ID as the filename
  - Useful for manual inspection and validation
  - Can be used for regression testing

## Running the Tests

### Prerequisites

1. Backend server must be running:
   ```bash
   cd backend
   python -m uvicorn main:app --reload
   ```

2. Database must be connected and healthy

3. Valid Gemini API key must be configured in `backend/.env`

### Execute Sample Tests

```bash
# From the project root directory
node sample_data/run_sample_tests.js
```

### Expected Output

The test runner will:
1. Check backend health
2. Generate quizzes for each test URL
3. Validate quiz structure and content
4. Save generated quizzes to files
5. Test error handling with invalid URLs
6. Display a summary of test results

### Test Duration

- Each quiz generation takes approximately 5-15 seconds
- Total test suite runtime: ~2-5 minutes (depending on LLM API response time)
- Includes 2-second delays between requests to avoid rate limiting

## Test Cases

### Valid Test Cases

#### 1. Short Article Test
- **URL:** https://en.wikipedia.org/wiki/Haiku
- **Description:** Tests with a short Wikipedia article
- **Expected:** 5-10 questions, key entities, sections, related topics

#### 2. Medium Article Test
- **URL:** https://en.wikipedia.org/wiki/Python_(programming_language)
- **Description:** Tests with a medium-length technical article
- **Expected:** 7-10 questions, includes "Guido van Rossum" in people entities

#### 3. Long Article Test
- **URL:** https://en.wikipedia.org/wiki/World_War_II
- **Description:** Tests with a long, complex historical article
- **Expected:** 8-10 questions, multiple entities in all categories

#### 4. Scientific Article Test
- **URL:** https://en.wikipedia.org/wiki/Photosynthesis
- **Description:** Tests with scientific/technical content
- **Expected:** 6-10 questions, technical terminology handled correctly

#### 5. Biographical Article Test
- **URL:** https://en.wikipedia.org/wiki/Albert_Einstein
- **Description:** Tests with a biographical article
- **Expected:** 7-10 questions, person-focused entities

#### 6. Historical Event Test
- **URL:** https://en.wikipedia.org/wiki/Moon_landing
- **Description:** Tests with a historical event article
- **Expected:** 6-10 questions, includes NASA and Neil Armstrong

#### 7. Geographical Article Test
- **URL:** https://en.wikipedia.org/wiki/Mount_Everest
- **Description:** Tests with a geographical article
- **Expected:** 5-10 questions, location-focused entities

#### 8. Technology Article Test
- **URL:** https://en.wikipedia.org/wiki/Artificial_intelligence
- **Description:** Tests with a modern technology article
- **Expected:** 7-10 questions, technical concepts handled well

### Invalid Test Cases

#### 1. Invalid URL Format
- **URL:** `not-a-valid-url`
- **Expected Error:** "Invalid Wikipedia URL format"

#### 2. Non-Wikipedia URL
- **URL:** `https://google.com`
- **Expected Error:** "Invalid Wikipedia URL format"

#### 3. Non-Existent Article
- **URL:** `https://en.wikipedia.org/wiki/ThisArticleDoesNotExist123456789`
- **Expected Error:** "Article not found"

#### 4. Empty URL
- **URL:** `` (empty string)
- **Expected Error:** "URL is required"

## Validation Criteria

Each generated quiz is validated against the following criteria:

### Structure Validation
- ✓ Has unique ID
- ✓ Has original URL
- ✓ Has article title
- ✓ Has summary (non-empty)

### Quiz Questions Validation
- ✓ Number of questions within expected range (5-10)
- ✓ Each question has:
  - Question text
  - Exactly 4 options (A-D)
  - Correct answer
  - Difficulty level (easy/medium/hard)
  - Explanation

### Metadata Validation
- ✓ Key entities with three categories:
  - People (array)
  - Organizations (array)
  - Locations (array)
- ✓ Sections (array of article sections)
- ✓ Related topics (array of suggested topics)

### Content Quality
- ✓ Questions are relevant to article content
- ✓ Explanations reference article sections
- ✓ Difficulty levels are varied
- ✓ No hallucinated information

## Generated Quiz Format

Each generated quiz is saved as a JSON file with the following structure:

```json
{
  "id": 1,
  "url": "https://en.wikipedia.org/wiki/Article_Name",
  "title": "Article Title",
  "summary": "Brief summary of the article...",
  "key_entities": {
    "people": ["Person 1", "Person 2"],
    "organizations": ["Org 1", "Org 2"],
    "locations": ["Location 1", "Location 2"]
  },
  "sections": ["Section 1", "Section 2", "Section 3"],
  "quiz": [
    {
      "question": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "difficulty": "medium",
      "explanation": "The answer is A because..."
    }
  ],
  "related_topics": ["Topic 1", "Topic 2", "Topic 3"]
}
```

## Troubleshooting

### Tests Failing

1. **Backend not healthy:**
   - Ensure backend server is running
   - Check database connection
   - Verify environment variables are set

2. **Quiz generation fails:**
   - Check Gemini API key is valid
   - Verify API rate limits not exceeded
   - Check network connectivity

3. **Validation errors:**
   - Review generated quiz files in `generated_quizzes/`
   - Check if LLM is returning expected structure
   - Verify prompt template is correct

### Rate Limiting

If you encounter rate limiting errors:
- Increase delay between requests in `run_sample_tests.js`
- Run tests in smaller batches
- Use a different API key or wait for rate limit reset

## Adding New Test Cases

To add new test cases, edit `test_urls.json`:

```json
{
  "id": "unique_test_id",
  "name": "Test Name",
  "url": "https://en.wikipedia.org/wiki/Article",
  "description": "Description of what this tests",
  "expected_characteristics": {
    "min_questions": 5,
    "max_questions": 10,
    "has_key_entities": true,
    "has_sections": true,
    "has_related_topics": true
  }
}
```

## Manual Testing

You can also manually test individual URLs:

```bash
# Using curl
curl -X POST http://localhost:8000/generate_quiz \
  -H "Content-Type: application/json" \
  -d '{"url": "https://en.wikipedia.org/wiki/Python_(programming_language)"}'

# Using the frontend
# 1. Start frontend: cd frontend && npm run dev
# 2. Open http://localhost:5173
# 3. Enter Wikipedia URL and click "Generate Quiz"
```

## Test Results

Test results are displayed in the console with:
- ✓ Green checkmarks for passed tests
- ✗ Red X marks for failed tests
- Detailed information about each test
- Summary statistics (pass rate, total tests, etc.)

Generated quizzes are saved to `generated_quizzes/` for manual inspection and verification.
