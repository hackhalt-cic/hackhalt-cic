/**
 * Password policy enforcer
 * Ensures strong passwords in production
 */

const validatePassword = (password) => {
  const errors = [];

  // Minimum length
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  // Maximum length (prevent DoS)
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Must contain uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Must contain lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Must contain number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Must contain special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = { validatePassword };
