const mongoose = require('mongoose');
const { sendError } = require('../utils/apiResponse');

/**
 * Middleware to ensure MongoDB connection is active before processing master data requests.
 * Prevents silent fallback or unpersisted writes if database connectivity is lost.
 */
const dbGuard = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return sendError(
      res,
      503,
      'Database service unavailable. Active MongoDB connection required for academic master data operations.'
    );
  }
  next();
};

module.exports = dbGuard;
