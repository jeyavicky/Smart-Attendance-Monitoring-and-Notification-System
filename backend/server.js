require('dotenv').config();
const app = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

let server = null;

const startServer = async () => {
  try {
    // Connect Database
    await connectDB();

    // In development mode, ensure default test accounts and academic master data are seeded
    if (process.env.NODE_ENV !== 'production') {
      try {
        const {
          seedUsers,
          seedAcademicMasterData,
          seedFacultyMappingsAndTimetable,
          seedAttendanceSessionsAndNotifications,
        } = require('./src/scripts/seed');
        await seedUsers(true);
        await seedAcademicMasterData(true);
        await seedFacultyMappingsAndTimetable(true);
        await seedAttendanceSessionsAndNotifications(true);
        console.log('👥 [Auth, Academics & Attendance] Development seed data verified');
      } catch (seedErr) {
        console.warn('⚠️  [Seed] Auto-seeding encountered notice:', seedErr.message);
      }
    }

    server = app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 Smart Attendance API Server running`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
      console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await disconnectDB();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  console.error('[FATAL] Unhandled Rejection:', err);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  process.exit(1);
});

startServer();
