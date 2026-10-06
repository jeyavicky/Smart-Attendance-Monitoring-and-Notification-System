const { verifyToken } = require('../utils/generateToken');
const User = require('../models/User');
const { sendError } = require('../utils/apiResponse');

/**
 * Authentication Middleware
 * Validates the JWT Bearer token and attaches authenticated user to req.user
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(
        res,
        401,
        'Authentication required. Please provide a valid authorization token.'
      );
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return sendError(
        res,
        401,
        'Authentication token is missing. Please sign in.'
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return sendError(
          res,
          401,
          'Your session has expired. Please log in again.'
        );
      }
      return sendError(
        res,
        401,
        'Invalid authentication token. Please log in again.'
      );
    }

    if (!decoded || !decoded.userId) {
      return sendError(
        res,
        401,
        'Invalid token payload. Authentication failed.'
      );
    }

    // Retrieve user from database (excluding passwordHash)
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      return sendError(
        res,
        401,
        'The user belonging to this token no longer exists.'
      );
    }

    if (!user.isActive) {
      return sendError(
        res,
        403,
        'Your account is inactive. Contact the administrator.'
      );
    }

    // Attach safe user object to request
    req.user = user;
    next();
  } catch (err) {
    return next(err);
  }
};

module.exports = authMiddleware;
