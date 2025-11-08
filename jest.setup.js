/**
 * Jest Setup File
 * Runs before each test file
 */

// Add custom matchers or global setup here
import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.VYSPA_API_URL = process.env.VYSPA_API_URL || '';
process.env.VYSPA_API_VERSION = process.env.VYSPA_API_VERSION || '1';
process.env.VYSPA_USERNAME = process.env.VYSPA_USERNAME || '';
process.env.VYSPA_PASSWORD = process.env.VYSPA_PASSWORD || '';
process.env.VYSPA_TOKEN = process.env.VYSPA_TOKEN || '';
