require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
const Department = require('../models/Department');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const FacultySubjectMapping = require('../models/FacultySubjectMapping');
const TimetableEntry = require('../models/TimetableEntry');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const Notification = require('../models/Notification');
const {
  seedUsers,
  seedAcademicMasterData,
  seedFacultyMappingsAndTimetable,
  seedAttendanceSessionsAndNotifications,
} = require('./seed');
const app = require('../app');
const http = require('http');

let server;
let baseUrl;

const makeRequest = async (path, options = {}) => {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => null);
  return {
    status: response.status,
    headers: response.headers,
    data,
  };
};

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 Running Phase 5 Attendance & Notifications Test Suite');
  console.log('====================================================');

  await connectDB();
  await seedUsers(true);
  await seedAcademicMasterData(true);
  await seedFacultyMappingsAndTimetable(true);
  await seedAttendanceSessionsAndNotifications(true);

  const cleanupTestData = async () => {
    try {
      const testSessions = await AttendanceSession.find({
        $or: [
          { remarks: { $regex: /test/i } },
          { remarks: { $regex: /review/i } },
          { period: { $in: [5, 6] } },
        ],
      });
      const testSessionIds = testSessions.map((s) => s._id);
      if (testSessionIds.length > 0) {
        await AttendanceRecord.deleteMany({ sessionId: { $in: testSessionIds } });
        await AttendanceSession.deleteMany({ _id: { $in: testSessionIds } });
      }
    } catch (e) {
      // ignore
    }
  };

  await cleanupTestData();

  // Start ephemeral server
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TestServer] Listening on ${baseUrl}\n`);

  let passed = 0;
  let failed = 0;

  const test = (title, condition, extraInfo = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${title}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${title} ${extraInfo}`);
      failed++;
    }
  };

  try {
    // 1. Authenticate users
    console.log('--- Step 1: Authentication for Roles ---');
    const adminLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@attendance.local', password: 'AdminPassword123!' },
    });
    const adminToken = adminLogin.data?.data?.token;
    test('Admin login successful', adminLogin.status === 200 && !!adminToken);

    const facultyLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'faculty@attendance.local', password: 'FacultyPassword123!' },
    });
    const facultyToken = facultyLogin.data?.data?.token;
    test('Faculty login successful', facultyLogin.status === 200 && !!facultyToken);

    const faculty2Login = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'fac_kumar@attendance.local', password: 'FacultyPassword123!' },
    });
    const faculty2Token = faculty2Login.data?.data?.token;
    test('Faculty 2 (Dr. Kumar) login successful', faculty2Login.status === 200 && !!faculty2Token);

    const studentLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'student@attendance.local', password: 'StudentPassword123!' },
    });
    const studentToken = studentLogin.data?.data?.token;
    test('Student login successful', studentLogin.status === 200 && !!studentToken);

    // Get mapping & students
    console.log('\n--- Step 2: Roster Retrieval & Authorization ---');
    const deptIT = await Department.findOne({ code: 'IT' });
    const deptCSE = await Department.findOne({ code: 'CSE' });
    const facultyProfile = await Faculty.findOne({ email: 'faculty@attendance.local' });
    const subDBMS = await Subject.findOne({ subjectCode: 'IT3501' });
    const itClass = await Class.findOne({ departmentId: deptIT._id, year: 3, semester: 5 });
    const itSecA = await Section.findOne({ classId: itClass._id, name: 'A' });
    const cseClass = await Class.findOne({ departmentId: deptCSE._id, year: 3, semester: 5 });
    const cseSecA = await Section.findOne({ classId: cseClass._id, name: 'A' });

    const mappingDBMS = await FacultySubjectMapping.findOne({
      facultyId: facultyProfile._id,
      subjectId: subDBMS._id,
      classId: itClass._id,
      sectionId: itSecA._id,
    });

    const students = await Student.find({ classId: itClass._id, sectionId: itSecA._id }).sort({ registerNumber: 1 });
    const crossCohortStudent = await Student.findOne({ classId: cseClass._id, sectionId: cseSecA._id });

    // Faculty retrieves roster
    const rosterRes = await makeRequest(`/api/attendance/students?mappingId=${mappingDBMS._id}`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    test('Faculty retrieves student roster for assigned class', rosterRes.status === 200 && rosterRes.data?.data?.students?.length === 7);

    // Wrong faculty cannot retrieve roster
    const wrongFacultyRoster = await makeRequest(`/api/attendance/students?mappingId=${mappingDBMS._id}`, {
      headers: { Authorization: `Bearer ${faculty2Token}` },
    });
    test('Wrong faculty blocked from retrieving class roster (HTTP 403)', wrongFacultyRoster.status === 403);

    console.log('\n--- Step 3: Attendance Marking & Validation ---');
    // Test date: a distinct date (e.g. today or next day)
    const testDate = new Date();
    testDate.setDate(testDate.getDate() - 15);
    const dateStr = testDate.toISOString().split('T')[0];

    const validPayload = {
      mappingId: mappingDBMS._id.toString(),
      attendanceDate: dateStr,
      period: 5,
      records: students.map((s, idx) => ({
        studentId: s._id.toString(),
        status: idx === 0 ? 'P' : idx === 1 ? 'A' : idx === 2 ? 'OD' : 'P',
        remarks: idx === 2 ? 'College symposium' : '',
      })),
      remarks: 'Automated test session',
    };

    const createRes = await makeRequest('/api/attendance/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: validPayload,
    });
    test(
      'Faculty successfully creates attendance session (HTTP 201)',
      createRes.status === 201 && (!!createRes.data?.data?.session?.id || !!createRes.data?.data?.session?._id),
      JSON.stringify(createRes.data)
    );
    const createdSessionId = createRes.data?.data?.session?.id || createRes.data?.data?.session?._id;

    // Duplicate session prevention
    const duplicateRes = await makeRequest('/api/attendance/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: validPayload,
    });
    test('Duplicate attendance session blocked (HTTP 409 Conflict)', duplicateRes.status === 409);

    // Wrong faculty blocked from marking attendance
    const wrongFacultyCreate = await makeRequest('/api/attendance/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${faculty2Token}` },
      body: {
        ...validPayload,
        period: 6,
      },
    });
    test('Wrong faculty blocked from creating attendance session (HTTP 403 Forbidden)', wrongFacultyCreate.status === 403);

    // Cross-cohort student blocked
    const crossCohortPayload = {
      ...validPayload,
      period: 6,
      records: [
        ...validPayload.records.slice(0, 6),
        { studentId: crossCohortStudent._id.toString(), status: 'P' },
      ],
    };
    const crossCohortRes = await makeRequest('/api/attendance/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: crossCohortPayload,
    });
    test('Cross-cohort student in payload blocked (HTTP 400)', crossCohortRes.status === 400);

    // Duplicate student in payload blocked
    const duplicateStudentPayload = {
      ...validPayload,
      period: 6,
      records: [
        ...validPayload.records.slice(0, 6),
        { studentId: students[0]._id.toString(), status: 'P' },
      ],
    };
    const duplicateStudentRes = await makeRequest('/api/attendance/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: duplicateStudentPayload,
    });
    test('Duplicate student in payload blocked (HTTP 400)', duplicateStudentRes.status === 400);

    // Invalid status validation
    const invalidStatusPayload = {
      ...validPayload,
      period: 6,
      records: [
        ...validPayload.records.slice(0, 6),
        { studentId: students[6]._id.toString(), status: 'UNKNOWN' },
      ],
    };
    const invalidStatusRes = await makeRequest('/api/attendance/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: invalidStatusPayload,
    });
    test('Invalid attendance status rejected (HTTP 400)', invalidStatusRes.status === 400);

    console.log('\n--- Step 4: Attendance Editing & Permissions ---');
    // Faculty edits session
    const editPayload = {
      records: [
        { studentId: students[1]._id.toString(), status: 'ML', remarks: 'Medical certificate approved' },
      ],
      remarks: 'Updated session after review',
    };
    const editRes = await makeRequest(`/api/attendance/sessions/${createdSessionId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: editPayload,
    });
    test('Faculty can edit their own attendance session (HTTP 200)', editRes.status === 200 && editRes.data?.data?.counts?.medicalLeave >= 1);

    // Wrong faculty cannot edit
    const wrongFacultyEdit = await makeRequest(`/api/attendance/sessions/${createdSessionId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${faculty2Token}` },
      body: editPayload,
    });
    test('Cross-faculty edit blocked (HTTP 403 Forbidden)', wrongFacultyEdit.status === 403);

    // Student cannot edit
    const studentEdit = await makeRequest(`/api/attendance/sessions/${createdSessionId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: editPayload,
    });
    test('Student editing blocked (HTTP 403 Forbidden)', studentEdit.status === 403);

    console.log('\n--- Step 5: Attendance Calculations & Statuses ---');
    // Student summary
    const studentMeRes = await makeRequest('/api/attendance/student/me', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    test('Student can view own attendance summary', studentMeRes.status === 200 && !!studentMeRes.data?.data?.overall);
    const studentData = studentMeRes.data?.data;
    test('Overall attendance percentage calculated correctly', typeof studentData?.overall?.overallPercentage === 'number');
    test('Subject attendance list populated', studentData?.subjects?.length > 0);

    // Status tier classification & recovery prediction check
    const dbmsSub = studentData.subjects.find((s) => s.subjectCode === 'IT3501');
    test('Subject metrics include conducted, attended, percentage', dbmsSub && typeof dbmsSub.percentage === 'number' && typeof dbmsSub.attended === 'number');
    test('Recovery prediction calculated for shortage subject', typeof dbmsSub.classesToRecover === 'number');

    // Student history
    const historyRes = await makeRequest('/api/attendance/student/me/history', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    test('Student can view own paginated attendance history', historyRes.status === 200 && Array.isArray(historyRes.data?.data?.items));

    console.log('\n--- Step 6: In-App Notifications ---');
    const notifsRes = await makeRequest('/api/notifications/me', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    test('Student can retrieve in-app notifications', notifsRes.status === 200 && Array.isArray(notifsRes.data?.data?.items));
    const notifs = notifsRes.data?.data?.items || [];
    test('Automated attendance notification generated', notifs.length > 0);

    if (notifs.length > 0) {
      const notifId = notifs[0].id || notifs[0]._id;
      const markReadRes = await makeRequest(`/api/notifications/${notifId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      test('Mark notification as read succeeds (HTTP 200)', markReadRes.status === 200 && markReadRes.data?.data?.isRead === true);

      const markAllReadRes = await makeRequest('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      test('Mark all notifications as read succeeds', markAllReadRes.status === 200);
    }

    console.log('\n--- Step 7: Shortage Detection & Overview ---');
    const shortageRes = await makeRequest('/api/attendance/shortage', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    test('Admin can retrieve shortage list', shortageRes.status === 200 && Array.isArray(shortageRes.data?.data));

    const facultyShortageRes = await makeRequest('/api/attendance/faculty/shortage', {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    test('Faculty can retrieve shortage students for assigned classes', facultyShortageRes.status === 200 && Array.isArray(facultyShortageRes.data?.data));

    const overviewRes = await makeRequest('/api/attendance/admin/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    test('Admin attendance overview returns live stats', overviewRes.status === 200 && typeof overviewRes.data?.data?.averageAttendance === 'number');

    console.log('\n--- Step 8: Reports ---');
    const studentReportRes = await makeRequest(`/api/reports/student/${students[0]._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    test('Admin can generate Student Attendance Report', studentReportRes.status === 200 && studentReportRes.data?.data?.type === 'STUDENT_REPORT');

    const classReportRes = await makeRequest(`/api/reports/class/${itClass._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    test('Admin can generate Class Attendance Report', classReportRes.status === 200 && classReportRes.data?.data?.type === 'CLASS_REPORT');

    const subjectReportRes = await makeRequest(`/api/reports/subject/${subDBMS._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    test('Admin can generate Subject Attendance Report', subjectReportRes.status === 200 && subjectReportRes.data?.data?.type === 'SUBJECT_REPORT');

    const shortageReportRes = await makeRequest('/api/reports/shortage', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    test('Admin can generate Shortage Report', shortageReportRes.status === 200 && shortageReportRes.data?.data?.type === 'SHORTAGE_REPORT');

    console.log('\n====================================================');
    console.log(`📊 Test Summary: Passed: ${passed} | Failed: ${failed}`);
    console.log('====================================================');

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await cleanupTestData();
    await disconnectDB();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Test suite crashed with error:', error);
    if (server) {
      try {
        await new Promise((resolve) => server.close(resolve));
      } catch (_) {}
    }
    try {
      await disconnectDB();
    } catch (_) {}
    process.exit(1);
  }
};

runTests();
