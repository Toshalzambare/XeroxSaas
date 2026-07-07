/**
 * Security Middleware Tests (Unit Tests)
 * 
 * These test the security utility functions DIRECTLY — no HTTP, no database.
 * They verify that our security rules work correctly in isolation.
 * 
 * If these break, it means someone accidentally weakened a security check.
 */

import {
  validatePassword,
  sanitizeFilename,
  isValidStorageKey,
} from '../middlewares/securityMiddleware';

describe('Password Validation', () => {

  it('should accept a strong password', () => {
    const result = validatePassword('StrongP@ss1');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject password shorter than 8 chars', () => {
    const result = validatePassword('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least 8 characters');
  });

  it('should reject password without uppercase', () => {
    const result = validatePassword('lowercase123!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least 1 uppercase letter');
  });

  it('should reject password without number', () => {
    const result = validatePassword('NoNumber!!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least 1 number');
  });

  it('should reject password without special character', () => {
    const result = validatePassword('NoSpecial123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least 1 special character (!@#$%^&*...)');
  });

  it('should return multiple errors for very weak password', () => {
    const result = validatePassword('abc');
    expect(result.valid).toBe(false);
    // Should fail on: length, uppercase, number, special char
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('should reject empty string', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
  });
});

describe('Filename Sanitization', () => {

  it('should keep normal filenames unchanged', () => {
    const result = sanitizeFilename('document.pdf');
    expect(result).toBe('document.pdf');
  });

  it('should remove path traversal (../)', () => {
    const result = sanitizeFilename('../../../etc/passwd');
    expect(result).not.toContain('..');
  });

  it('should remove backslash path traversal (..\\)', () => {
    const result = sanitizeFilename('..\\..\\windows\\system32');
    expect(result).not.toContain('..\\');
  });

  it('should replace special characters with underscore', () => {
    const result = sanitizeFilename('file<name>with|bad*chars');
    expect(result).not.toMatch(/[<>|*]/);
  });

  it('should replace spaces with underscores', () => {
    const result = sanitizeFilename('my document file.pdf');
    expect(result).toBe('my_document_file.pdf');
  });

  it('should truncate filenames over 200 characters', () => {
    const longName = 'a'.repeat(300) + '.pdf';
    const result = sanitizeFilename(longName);
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it('should keep parentheses in filenames', () => {
    const result = sanitizeFilename('report (final).pdf');
    expect(result).toContain('(final)');
  });
});

describe('S3 Storage Key Validation', () => {

  it('should accept valid storage keys', () => {
    expect(isValidStorageKey('uploads/user123/document.pdf')).toBe(true);
  });

  it('should reject keys with path traversal (..)', () => {
    expect(isValidStorageKey('uploads/../secret/file')).toBe(false);
  });

  it('should reject keys starting with /', () => {
    expect(isValidStorageKey('/absolute/path')).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(isValidStorageKey('')).toBe(false);
  });

  it('should reject null/undefined', () => {
    expect(isValidStorageKey(null as any)).toBe(false);
    expect(isValidStorageKey(undefined as any)).toBe(false);
  });

  it('should reject keys longer than 500 chars', () => {
    const longKey = 'a/'.repeat(300);
    expect(isValidStorageKey(longKey)).toBe(false);
  });
});
