const fs = require('fs').promises;
const path = require('path');
const { 
  readJson, 
  writeJson, 
  initializeDataFiles 
} = require('../utils/fileUtils');
const { 
  validateUserData, 
  validatePostData, 
  validateGroupData,
  validatePaginationParams,
  generateId,
  sanitizeText,
  isValidEmail,
  isValidId
} = require('../utils/validation');
const { 
  generateNewsflash, 
  generateNewsflashGPT 
} = require('../utils/newsflashGenerator');

// Mock fs for fileUtils tests
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn()
  }
}));

describe('Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation Utils', () => {
    describe('validateUserData', () => {
      test('should validate correct user data', () => {
        const userData = {
          fullName: 'John Doe',
          email: 'john@example.com'
        };

        const result = validateUserData(userData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should reject invalid email', () => {
        const userData = {
          fullName: 'John Doe',
          email: 'invalid-email'
        };

        const result = validateUserData(userData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Valid email address is required');
      });
    });

    describe('validatePostData', () => {
      test('should validate correct post data', () => {
        const postData = {
          rawText: 'This is a test post',
          userId: 'u123456789'
        };

        const result = validatePostData(postData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should reject empty rawText', () => {
        const postData = {
          rawText: '',
          userId: 'u123456789'
        };

        const result = validatePostData(postData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Post text is required and must be a string');
      });
    });

    describe('ID validation functions', () => {
      test('isValidId should validate IDs', () => {
        expect(isValidId('u123456789')).toBe(true);
        expect(isValidId('uabcdefghi')).toBe(true);
        expect(isValidId('p123456789')).toBe(true);
        expect(isValidId('123456789')).toBe(true);
        expect(isValidId('')).toBe(false);
        expect(isValidId(null)).toBe(false);
        expect(isValidId(undefined)).toBe(false);
      });

      test('isValidEmail should validate email addresses', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
        expect(isValidEmail('invalid-email')).toBe(false);
        expect(isValidEmail('')).toBe(false);
      });
    });

    describe('generateId', () => {
      test('should generate user ID with correct prefix', () => {
        const id = generateId('u');
        expect(id).toMatch(/^u[a-z0-9]+$/);
      });

      test('should generate unique IDs', () => {
        const id1 = generateId('u');
        const id2 = generateId('u');
        expect(id1).not.toBe(id2);
      });
    });

    describe('sanitizeText', () => {
      test('should remove HTML tags', () => {
        const input = '<script>alert("xss")</script>Hello world';
        const sanitized = sanitizeText(input);
        expect(sanitized).toBe('scriptalert("xss")/scriptHello world');
      });

      test('should trim whitespace', () => {
        const input = '  Hello world  ';
        const sanitized = sanitizeText(input);
        expect(sanitized).toBe('Hello world');
      });

      test('should handle empty input', () => {
        expect(sanitizeText('')).toBe('');
        expect(sanitizeText(null)).toBe('');
        expect(sanitizeText(undefined)).toBe('');
      });
    });
  });

  describe('Newsflash Generator', () => {
    describe('generateNewsflash', () => {
      test('should generate newsflash with prefix', () => {
        const result = generateNewsflash('I got a new job!', 'John Doe');
        
        expect(result).toContain('John Doe');
        expect(result).toContain('got a new job');
        expect(result).toMatch(/^(BREAKING|URGENT|DEVELOPING|EXCLUSIVE|ALERT|NEWS FLASH):/);
      });

      test('should handle emojis correctly', () => {
        const result = generateNewsflash('I got a dog 🐶', 'Jane Smith');
        
        expect(result).toContain('🐶');
        expect(result).toContain('Jane Smith');
      });

      test('should use EXCLUSIVE for secret content', () => {
        const result = generateNewsflash('I have a secret project', 'Bob Johnson');
        
        expect(result).toContain('EXCLUSIVE:');
        expect(result).toContain('Bob Johnson');
      });
    });
  });
}); 