const express = require('express');
const router = express.Router();

const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const academicYearRoutes = require('./academicYearRoutes');
const departmentRoutes = require('./departmentRoutes');
const classRoutes = require('./classRoutes');
const sectionRoutes = require('./sectionRoutes');
const subjectRoutes = require('./subjectRoutes');
const facultyRoutes = require('./facultyRoutes');
const studentRoutes = require('./studentRoutes');
const adminRoutes = require('./adminRoutes');
const facultyMappingRoutes = require('./facultyMappingRoutes');
const timetableRoutes = require('./timetableRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const notificationRoutes = require('./notificationRoutes');
const reportRoutes = require('./reportRoutes');

// Health endpoint: /api/health
router.use('/', healthRoutes);

// Auth endpoints: /api/auth
router.use('/auth', authRoutes);

// Academic Master Data endpoints
router.use('/academic-years', academicYearRoutes);
router.use('/departments', departmentRoutes);
router.use('/classes', classRoutes);
router.use('/sections', sectionRoutes);
router.use('/subjects', subjectRoutes);
router.use('/faculty', facultyRoutes);
router.use('/students', studentRoutes);
router.use('/student', studentRoutes);
router.use('/admin', adminRoutes);

// Phase 4: Faculty Mapping & Timetable
router.use('/faculty-mappings', facultyMappingRoutes);
router.use('/faculty-mapping', facultyMappingRoutes);
router.use('/timetable', timetableRoutes);
router.use('/timetables', timetableRoutes);

// Phase 5: Attendance, Notifications, and Reports
router.use('/attendance', attendanceRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
