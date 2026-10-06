const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is missing in production!');
    }
    return 'fallback_super_secret_jwt_key_smart_attendance_2026';
  }
  return secret;
};

/**
 * Generate JWT token containing minimal payload (userId and role)
 * Never include sensitive details or passwords
 * @param {Object} user - User document or object with _id and role
 * @returns {string} Signed JWT token
 */
const generateToken = (user) => {
  const payload = {
    userId: user._id ? user._id.toString() : user.id,
    role: user.role,
  };

  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - The raw JWT token string
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
};

module.exports = {
  generateToken,
  verifyToken,
};
