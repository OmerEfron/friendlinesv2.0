const request = require("supertest");
const { generateNewsflash } = require("../utils/newsflashGenerator");
const { validateUserData, validatePostData } = require("../utils/validation");

// Test the newsflash generation utility
describe("Newsflash Generation", () => {
  test("should generate basic newsflash", () => {
    const result = generateNewsflash("I got a new job!", "John Doe");
    expect(result).toContain("John Doe");
    expect(result).toContain("got a new job");
    expect(result).toMatch(
      /^(BREAKING|URGENT|DEVELOPING|EXCLUSIVE|ALERT|NEWS FLASH):/
    );
  });

  test("should handle emojis in newsflash", () => {
    const result = generateNewsflash("I got a dog 🐶", "Jane Smith");
    expect(result).toContain("🐶");
    expect(result).toContain("Jane Smith");
  });

  test("should use EXCLUSIVE prefix for secret content", () => {
    const result = generateNewsflash("I have a secret project", "Bob Johnson");
    expect(result).toContain("EXCLUSIVE:");
  });

  test("should handle first-person pronouns", () => {
    const result = generateNewsflash("I am going to the store", "Alice Brown");
    expect(result).toContain("Alice Brown");
    expect(result).not.toContain(" I ");
  });
});

// Test validation utilities
describe("Validation Utilities", () => {
  test("should validate correct user data", () => {
    const userData = {
      fullName: "John Doe",
      email: "john@example.com",
    };
    const result = validateUserData(userData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("should reject invalid email", () => {
    const userData = {
      fullName: "John Doe",
      email: "invalid-email",
    };
    const result = validateUserData(userData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Valid email address is required");
  });

  test("should validate correct post data", () => {
    const postData = {
      rawText: "This is a test post",
      userId: "user123",
    };
    const result = validatePostData(postData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("should reject empty post text", () => {
    const postData = {
      rawText: "",
      userId: "user123",
    };
    const result = validatePostData(postData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Post text is required and must be a string"
    );
  });

  test("should reject too long post text", () => {
    const postData = {
      rawText: "a".repeat(300), // 300 characters
      userId: "user123",
    };
    const result = validatePostData(postData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Post text cannot exceed 280 characters");
  });
});

// Integration tests would go here
// For now, we'll just test the utilities since the server tests require the server to be running
