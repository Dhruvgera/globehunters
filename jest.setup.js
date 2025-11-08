/**
 * Jest Setup File
 * Runs before each test file
 */

// Add custom matchers or global setup here
import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.VYSPA_API_URL = 'https://a1.stagev4.vyspa.net/jsonserver.php';
process.env.VYSPA_USERNAME = 'RemBook';
process.env.VYSPA_PASSWORD = 'GHR3mPa55';
process.env.VYSPA_TOKEN = 'AE8C3HLS04NF7';
