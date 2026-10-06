const { sendError } = require('../utils/apiResponse');

/**
 * Role-Based Authorization Middleware
 * Restricts access to users having specified roles
 * @param  {...string} allowedRoles - Array or rest params of permitted roles ('admin', 'faculty', 'student')
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(
        res,
        401,
        'Authentication required before role verification.'
      );
    }

    // Flatten if an array was passed as a single argument
    const roles = allowedRoles.flat();

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Access denied. Your role '${req.user.role}' does not have permission to access this resource.`
      );
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
};
