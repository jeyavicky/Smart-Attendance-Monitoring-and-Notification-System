const { sendError } = require('../utils/apiResponse');

const notFoundHandler = (req, res, next) => {
  return sendError(
    res,
    404,
    `Route not found: ${req.method} ${req.originalUrl}`
  );
};

module.exports = notFoundHandler;
