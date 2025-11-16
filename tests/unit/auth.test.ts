import { describe, it, expect } from '@jest/globals';

describe('Authentication Utilities', () => {
  it('should validate email format', () => {
    const validEmails = [
      'test@example.com',
      'user+tag@domain.co.uk',
      'name.surname@company.org'
    ];

    const invalidEmails = [
      'notanemail',
      '@example.com',
      'user@',
      'user @example.com'
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true);
    });

    invalidEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });

  it('should validate password strength', () => {
    const strongPasswords = [
      'MyPass123!',
      'Secure@2024',
      'C0mpl3x!Pass'
    ];

    const weakPasswords = [
      'short',
      'noupppercase123',
      'NOLOWERCASE123',
      'NoNumbers!',
      'NoSpecialChar123'
    ];

    // Password must have: 8+ chars, uppercase, lowercase, number, special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    strongPasswords.forEach(password => {
      expect(passwordRegex.test(password)).toBe(true);
    });

    weakPasswords.forEach(password => {
      expect(passwordRegex.test(password)).toBe(false);
    });
  });
});
