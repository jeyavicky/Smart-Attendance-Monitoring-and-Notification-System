const mongoose = require('mongoose');
const { sendSuccess } = require('../utils/apiResponse');

const getDatabaseStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const readyState = mongoose.connection.readyState;
  return {
    state: states[readyState] || 'unknown',
    connected: readyState === 1,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
};

const getHealthStatus = (req, res) => {
  const dbStatus = getDatabaseStatus();

  const healthData = {
    system: 'Smart Attendance Monitoring and Notification System API',
    status: dbStatus.connected ? 'healthy' : 'degraded',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    memoryUsage: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    },
  };

  const statusCode = dbStatus.connected ? 200 : 503;
  return sendSuccess(res, statusCode, 'Service health check passed', healthData);
};

module.exports = {
  getHealthStatus,
};
