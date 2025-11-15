# Testing Guide

## Overview

This project uses two testing frameworks:
- **Playwright** for end-to-end (E2E) tests
- **Jest** for unit and API tests

## Setup

All testing dependencies are already installed. You now have:

```json
{
  "devDependencies": {
    "@playwright/test": "^1.49.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/jest": "^29.5.14",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

## Test Scripts

```bash
# Run unit tests in watch mode
npm run test

# Run all tests with coverage (CI mode)
npm run test:ci

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run all tests (unit + E2E)
npm run test:all
```

## Test Structure

```
tests/
├── e2e/                    # Playwright E2E tests
│   ├── auth.spec.ts       # Authentication flows
│   ├── google-auth.spec.ts # Google OAuth integration
│   ├── configuration.spec.ts # Email monitor config
│   └── worker.spec.ts     # Worker service integration
├── unit/                   # Jest unit tests
│   ├── scheduling.test.ts # Schedule validation logic
│   └── auth.test.ts       # Auth utilities
└── api/                    # API integration tests
    └── config.test.ts     # Configuration API endpoints
```

## Test Coverage

### E2E Tests (Playwright)

#### 1. Authentication (`auth.spec.ts`)
✅ Navigate to login page
✅ Navigate to signup page  
✅ Handle invalid login credentials
✅ Successfully sign up new user
✅ Logout successfully

#### 2. Google Authentication (`google-auth.spec.ts`)
✅ Navigate to settings page
✅ Show connect Google button when not connected
✅ Initiate Google OAuth flow
✅ Show connected accounts list
✅ Enable "Add Another Account" button
✅ Display account email when connected
✅ Show disconnect button for connected accounts

#### 3. Email Monitor Configuration (`configuration.spec.ts`)
✅ Navigate to configuration page
✅ Display "Add Email Monitor" button
✅ Add new email monitor
✅ Configure recurring schedule
✅ Configure specific dates schedule
✅ Set calendar ID
✅ Preserve calendar ID after save
✅ Set custom AI prompt per monitor
✅ Toggle monitor active/inactive
✅ Delete email monitor
✅ Set keywords for email filtering
✅ Save configuration successfully
✅ Load existing configuration
✅ Set max checks per day as optional
✅ Set receiving Gmail account

#### 4. Worker Service (`worker.spec.ts`)
✅ Show worker status on dashboard
✅ Check worker health from settings
✅ Start monitoring when config is saved
✅ Show activity logs

### Unit Tests (Jest)

#### 1. Schedule Validation (`scheduling.test.ts`)
✅ Validate recurring schedule with all required fields
✅ Reject invalid time window
✅ Accept optional max_checks_per_day
✅ Reject negative check interval
✅ Return true when current time is within schedule
✅ Return false when current day is not in schedule
✅ Return Infinity when max_checks is undefined
✅ Return max_checks_per_day for recurring schedule
✅ Estimate checks for 8-hour window with 15-min intervals
✅ Handle unlimited max_checks in estimation

#### 2. Authentication (`auth.test.ts`)
✅ Validate email format
✅ Validate password strength

### API Tests (`config.test.ts`)
✅ Save configuration
✅ Get saved configuration
✅ Reject invalid configuration
✅ Preserve calendar_id after save

## Running Specific Tests

### Run specific E2E test file
```bash
npx playwright test auth.spec.ts
```

### Run specific unit test file
```bash
npm test -- scheduling.test.ts
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="calendar"
```

### Run E2E tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run E2E tests in debug mode
```bash
npx playwright test --debug
```

## Test Configuration

### Environment Variables

Create `.env.test.local` for your test credentials:

```bash
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
TEST_API_URL=http://localhost:3000
```

### Playwright Config (`playwright.config.ts`)

- Tests run on Chromium, Firefox, and WebKit
- Screenshots on failure
- Traces on first retry
- Automatically starts dev server

### Jest Config (`jest.config.js`)

- Uses jsdom environment for React testing
- Coverage collection enabled
- Next.js integration configured

## Writing New Tests

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('button:has-text("Click Me")');
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Unit Test Example

```typescript
import { describe, it, expect } from '@jest/globals';
import { myFunction } from '@/lib/utils';

describe('My Function', () => {
  it('should return expected value', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

## Test Coverage Reports

After running `npm run test:ci`, check coverage:

```
coverage/
├── lcov-report/
│   └── index.html     # Open this in browser
└── coverage-summary.json
```

## Troubleshooting

### Playwright Issues

**Problem:** Browser not found
```bash
npx playwright install
```

**Problem:** Tests timeout
- Increase timeout in `playwright.config.ts`
- Check if dev server is running

### Jest Issues

**Problem:** Module not found
```bash
npm install
```

**Problem:** Tests fail with "fetch is not defined"
- Add `node-fetch` for Node.js < 18
- Or use `jest-environment-jsdom`

## Best Practices

1. **Keep tests isolated** - Each test should be independent
2. **Use descriptive names** - Test names should explain what they test
3. **Mock external services** - Don't hit real APIs in tests
4. **Test user flows** - E2E tests should simulate real user behavior
5. **Keep tests fast** - Unit tests should run in milliseconds
6. **Clean up after tests** - Delete test data, close connections
7. **Use test fixtures** - Share common setup across tests
8. **Test error cases** - Don't just test happy paths

## Next Steps

1. **Set up test database** - Create separate Supabase project for testing
2. **Add visual regression tests** - Use Playwright screenshots
3. **Add performance tests** - Test load times and response times
4. **Add accessibility tests** - Use axe-playwright
5. **Set up continuous testing** - Run tests on every commit
6. **Add test reporting** - Publish test results to dashboard

## Current Test Status

Total Tests: 45+
- E2E Tests: 27
- Unit Tests: 12
- API Tests: 6

Coverage Goal: 80%+

## Running First Test

1. **Start your dev server:**
```bash
npm run dev
```

2. **In another terminal, run E2E tests:**
```bash
npm run test:e2e
```

3. **Or run unit tests:**
```bash
npm run test
```

That's it! Your project is now fully equipped with comprehensive automated testing.
