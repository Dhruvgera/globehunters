/**
 * Jest Setup File
 * Runs before each test file
 */

// Add custom matchers or global setup here
import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.VYSPA_API_URL = 'https://api.globehunters.com';
process.env.VYSPA_API_VERSION = '1';
process.env.VYSPA_USERNAME = 'RemBook';
process.env.VYSPA_PASSWORD = 'GHR3mPa55';
process.env.VYSPA_TOKEN = 'AE8C3HLS04NF7';
