const { validateProfileUpdateData, isValidId } = require('../utils/validation');

describe('Profile Update Unit Tests', () => {
  describe('validateProfileUpdateData', () => {
    test('should validate empty profile data', () => {
      const result = validateProfileUpdateData({});
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate valid profile data', () => {
      const profileData = {
        fullName: 'John Smith',
        bio: 'Software developer',
        location: 'San Francisco, CA',
        website: 'https://johnsmith.dev'
      };
      
      const result = validateProfileUpdateData(profileData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject bio that is too long', () => {
      const profileData = {
        bio: 'a'.repeat(161)
      };
      
      const result = validateProfileUpdateData(profileData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Bio must be 160 characters or less');
    });

    test('should reject invalid website URL', () => {
      const profileData = {
        website: 'not-a-valid-url'
      };
      
      const result = validateProfileUpdateData(profileData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Website must be a valid URL');
    });

    test('should allow empty bio', () => {
      const profileData = {
        bio: ''
      };
      
      const result = validateProfileUpdateData(profileData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('isValidId', () => {
    test('should validate proper user IDs', () => {
      expect(isValidId('u123456789')).toBe(true);
      expect(isValidId('u1737582951001abc')).toBe(true);
    });

    test('should reject invalid IDs', () => {
      expect(isValidId('')).toBe(false);
      expect(isValidId(null)).toBe(false);
      expect(isValidId(undefined)).toBe(false);
      expect(isValidId('invalid id with spaces')).toBe(false);
      expect(isValidId('invalid@id')).toBe(false);
    });
  });
}); 