require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
const Department = require('../models/Department');
const Class = require('../models/Class');
const Section = require('../models/Section');
const { Subject } = require('../models/Subject');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const FacultySubjectMapping = require('../models/FacultySubjectMapping');
const TimetableEntry = require('../models/TimetableEntry');
const {
  seedUsers,
  seedAcademicMasterData,
  seedFacultyMappingsAndTimetable,
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
  console.log('🧪 Running Phase 4 Faculty Mapping & Timetable Test Suite');
  console.log('====================================================');

  await connectDB();
  await seedUsers(true);
  await seedAcademicMasterData(true);
  await seedFacultyMappingsAndTimetable(true);

  const cleanupTestData = async () => {
    try {
      await TimetableEntry.deleteMany({ dayOfWeek: 'Saturday' });
      const subDS = await Subject.findOne({ subjectCode: 'IT3301' });
      if (subDS) {
        await FacultySubjectMapping.deleteMany({ subjectId: subDS._id });
      }
    } catch (e) {
      // ignore
    }
  };

  await cleanupTestData();

  // Start test server on random ephemeral port
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TestServer] Listening on ${baseUrl}\n`);

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (details) console.error(`     Details: ${details}`);
      failed++;
    }
  };

  try {
    // -----------------------------------------------------------------
    // 1. Authenticate Roles
    // -----------------------------------------------------------------
    console.log('🔐 [Setup] Authenticating test user roles...');
    const adminLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@attendance.local', password: 'AdminPassword123!' },
    });
    const adminToken = adminLogin.data?.data?.token;
    assert(adminLogin.status === 200 && adminToken, 'Admin authentication successful');

    const facultyLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'faculty@attendance.local', password: 'FacultyPassword123!' },
    });
    const facultyToken = facultyLogin.data?.data?.token;
    assert(facultyLogin.status === 200 && facultyToken, 'Faculty authentication successful');

    const studentLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'student@attendance.local', password: 'StudentPassword123!' },
    });
    const studentToken = studentLogin.data?.data?.token;
    assert(studentLogin.status === 200 && studentToken, 'Student authentication successful');

    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const facultyHeaders = { Authorization: `Bearer ${facultyToken}` };
    const studentHeaders = { Authorization: `Bearer ${studentToken}` };

    // Fetch prerequisite entities
    const [fac1, fac2, deptIT, deptCSE, ayCurrent] = await Promise.all([
      Faculty.findOne({ employeeId: 'FAC001' }),
      Faculty.findOne({ employeeId: 'FAC002' }),
      Department.findOne({ code: 'IT' }),
      Department.findOne({ code: 'CSE' }),
      AcademicYear.findOne({ isCurrent: true }),
    ]);

    const itY3Class = await Class.findOne({ departmentId: deptIT._id, year: 3, semester: 5 });
    const itY2Class = await Class.findOne({ departmentId: deptIT._id, year: 2, semester: 3 });
    const cseY3Class = await Class.findOne({ departmentId: deptCSE._id, year: 3, semester: 5 });

    const itY3SecA = await Section.findOne({ classId: itY3Class._id, name: 'A' });
    const itY3SecB = await Section.findOne({ classId: itY3Class._id, name: 'B' });
    const cseY3SecA = await Section.findOne({ classId: cseY3Class._id, name: 'A' });

    const subDBMS = await Subject.findOne({ subjectCode: 'IT3501' }); // Sem 5
    const subWT = await Subject.findOne({ subjectCode: 'IT3504' });   // Sem 5
    const subDS = await Subject.findOne({ subjectCode: 'IT3301' });   // Sem 3

    // -----------------------------------------------------------------
    // 2. Faculty Mapping Tests
    // -----------------------------------------------------------------
    console.log('\n📚 [Faculty Mapping] Testing CRUD and Integrity Constraints...');

    // 2.1 GET All Mappings
    const getAllMappingsRes = await makeRequest('/api/faculty-mappings', {
      headers: adminHeaders,
    });
    assert(
      getAllMappingsRes.status === 200 && getAllMappingsRes.data?.data?.items?.length > 0,
      'GET /api/faculty-mappings returns paginated list of mappings',
      JSON.stringify(getAllMappingsRes.data)
    );

    const firstMapping = getAllMappingsRes.data?.data?.items[0];

    // 2.2 GET Mapping By ID
    const getMappingByIdRes = await makeRequest(`/api/faculty-mappings/${firstMapping.id}`, {
      headers: adminHeaders,
    });
    assert(
      getMappingByIdRes.status === 200 && getMappingByIdRes.data?.data?.id === firstMapping.id,
      'GET /api/faculty-mappings/:id returns mapping with populated details'
    );

    // 2.3 Create Valid New Mapping
    // Map FAC001 to IT Year 2 Sem 3 (IT3301 Data Structures)
    const itY2SecA = await Section.findOne({ classId: itY2Class._id, name: 'A' });
    const createMappingRes = await makeRequest('/api/faculty-mappings', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        facultyId: fac1._id.toString(),
        subjectId: subDS._id.toString(),
        classId: itY2Class._id.toString(),
        sectionId: itY2SecA._id.toString(),
      },
    });
    assert(
      createMappingRes.status === 201 && createMappingRes.data?.data?.id,
      'POST /api/faculty-mappings creates a valid mapping successfully',
      JSON.stringify(createMappingRes.data)
    );
    const createdMappingId = createMappingRes.data?.data?.id;

    // 2.4 Duplicate Mapping Prevention (HTTP 409)
    const duplicateMappingRes = await makeRequest('/api/faculty-mappings', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        facultyId: fac1._id.toString(),
        subjectId: subDS._id.toString(),
        classId: itY2Class._id.toString(),
        sectionId: itY2SecA._id.toString(),
      },
    });
    assert(
      duplicateMappingRes.status === 409,
      'POST /api/faculty-mappings prevents duplicate assignment (HTTP 409)',
      `Status: ${duplicateMappingRes.status}, Error: ${duplicateMappingRes.data?.message}`
    );

    // 2.5 Semester Mismatch Integrity Check (HTTP 400)
    // Attempting to assign subDS (Sem 3) to itY3Class (Sem 5)
    const mismatchSemRes = await makeRequest('/api/faculty-mappings', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        facultyId: fac1._id.toString(),
        subjectId: subDS._id.toString(),
        classId: itY3Class._id.toString(),
        sectionId: itY3SecA._id.toString(),
      },
    });
    assert(
      mismatchSemRes.status === 400,
      'POST /api/faculty-mappings rejects semester mismatch between subject and class (HTTP 400)',
      `Status: ${mismatchSemRes.status}`
    );

    // 2.6 Section not belonging to Class Integrity Check (HTTP 400)
    const invalidSecRes = await makeRequest('/api/faculty-mappings', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        facultyId: fac1._id.toString(),
        subjectId: subDBMS._id.toString(),
        classId: itY3Class._id.toString(),
        sectionId: cseY3SecA._id.toString(), // Section from CSE class!
      },
    });
    assert(
      invalidSecRes.status === 400,
      'POST /api/faculty-mappings rejects section not belonging to class cohort (HTTP 400)',
      `Status: ${invalidSecRes.status}`
    );

    // 2.7 PATCH Mapping Status
    const toggleMappingStatusRes = await makeRequest(
      `/api/faculty-mappings/${createdMappingId}/status`,
      {
        method: 'PATCH',
        headers: adminHeaders,
        body: { isActive: false },
      }
    );
    assert(
      toggleMappingStatusRes.status === 200 &&
        toggleMappingStatusRes.data?.data?.isActive === false,
      'PATCH /api/faculty-mappings/:id/status updates active status'
    );

    // Re-activate mapping
    await makeRequest(`/api/faculty-mappings/${createdMappingId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { isActive: true },
    });

    // 2.8 Referential Integrity on DELETE (Cannot delete mapping if timetable entries reference it)
    const existingTt = await TimetableEntry.findOne({ isActive: true });
    const referencedMappingId = existingTt.facultyMappingId.toString();
    const deleteReferencedRes = await makeRequest(
      `/api/faculty-mappings/${referencedMappingId}`,
      {
        method: 'DELETE',
        headers: adminHeaders,
      }
    );
    assert(
      deleteReferencedRes.status === 400,
      'DELETE /api/faculty-mappings/:id prevents deletion when referenced by timetable entries (HTTP 400)',
      `Status: ${deleteReferencedRes.status}, Message: ${deleteReferencedRes.data?.message}`
    );

    // 2.9 Workload Summary API
    const workloadRes = await makeRequest('/api/faculty-mappings/workload', {
      headers: adminHeaders,
    });
    assert(
      workloadRes.status === 200 && Array.isArray(workloadRes.data?.data),
      'GET /api/faculty-mappings/workload returns workload stats per faculty member'
    );

    // 2.10 Faculty Personal Mappings Endpoint
    const myMappingsRes = await makeRequest('/api/faculty-mappings/me', {
      headers: facultyHeaders,
    });
    assert(
      myMappingsRes.status === 200 &&
        myMappingsRes.data?.data?.faculty?.employeeId === 'FAC001' &&
        myMappingsRes.data?.data?.mappings?.length > 0,
      'GET /api/faculty-mappings/me returns personal assigned mappings for authenticated faculty'
    );

    // 2.11 RBAC: Students & Faculty Forbidden from Creating Mappings
    const studentCreateMapRes = await makeRequest('/api/faculty-mappings', {
      method: 'POST',
      headers: studentHeaders,
      body: {
        facultyId: fac1._id.toString(),
        subjectId: subWT._id.toString(),
        classId: itY3Class._id.toString(),
        sectionId: itY3SecA._id.toString(),
      },
    });
    assert(
      studentCreateMapRes.status === 403,
      'POST /api/faculty-mappings returns 403 Forbidden for Student'
    );

    const facCreateMapRes = await makeRequest('/api/faculty-mappings', {
      method: 'POST',
      headers: facultyHeaders,
      body: {
        facultyId: fac1._id.toString(),
        subjectId: subWT._id.toString(),
        classId: itY3Class._id.toString(),
        sectionId: itY3SecA._id.toString(),
      },
    });
    assert(
      facCreateMapRes.status === 403,
      'POST /api/faculty-mappings returns 403 Forbidden for Faculty'
    );

    // -----------------------------------------------------------------
    // 3. Timetable Entry & Conflict Detection Tests
    // -----------------------------------------------------------------
    console.log('\n📅 [Timetable] Testing Scheduling, Grid, & Conflict Prevention...');

    // 3.1 GET All Timetable Entries
    const getAllTtRes = await makeRequest('/api/timetable', {
      headers: adminHeaders,
    });
    assert(
      getAllTtRes.status === 200 && getAllTtRes.data?.data?.items?.length > 0,
      'GET /api/timetable returns paginated timetable entries'
    );

    // 3.2 GET Grid Matrix Format
    const getGridRes = await makeRequest('/api/timetable?format=grid', {
      headers: adminHeaders,
    });
    assert(
      getGridRes.status === 200 &&
        getGridRes.data?.data?.grid?.Monday !== undefined &&
        getGridRes.data?.data?.grid?.Friday !== undefined,
      'GET /api/timetable?format=grid returns weekly day-period schedule matrix'
    );

    // 3.3 Create Valid Timetable Entry
    // Saturday Period 1 (09:00 - 09:50) using createdMappingId (FAC001, IT Year 2)
    const createTtRes = await makeRequest('/api/timetable', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        facultyMappingId: createdMappingId,
        dayOfWeek: 'Saturday',
        period: 1,
        startTime: '09:00',
        endTime: '09:50',
        room: 'Lab-2',
      },
    });
    assert(
      createTtRes.status === 201 && createTtRes.data?.data?.id,
      'POST /api/timetable creates a valid timetable period entry',
      JSON.stringify(createTtRes.data)
    );
    const createdTtId = createTtRes.data?.data?.id;

    // 3.4 Conflict Check 1: Faculty Double-Booking (HTTP 409)
    // FAC001 is now booked on Saturday Period 1 in IT Year 2.
    // Try to book FAC001 on Saturday Period 1 in another class (anotherFac1Mapping)
    const anotherFac1Mapping = await FacultySubjectMapping.findOne({
      facultyId: fac1._id,
      _id: { $ne: createdMappingId },
      isActive: true,
    });

    const facConflictRes = await makeRequest('/api/timetable', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        facultyMappingId: anotherFac1Mapping._id.toString(),
        dayOfWeek: 'Saturday',
        period: 1,
        startTime: '09:00',
        endTime: '09:50',
        room: 'Room-301',
      },
    });
    assert(
      facConflictRes.status === 409 &&
        facConflictRes.data?.message?.toLowerCase().includes('faculty double-booking'),
      'Conflict Check 1: Prevents Faculty Double-Booking on same day & period (HTTP 409)',
      `Status: ${facConflictRes.status}, Error: ${facConflictRes.data?.message}`
    );

    // 3.5 Conflict Check 2: Class/Section Timetable Conflict (HTTP 409)
    // Saturday Period 1 is booked for IT Year 2 Sec A.
    // Try to book another subject/faculty into the same class & section at Saturday Period 1
    // (create dummy mapping for fac2 in itY2)
    const fac2Mapping = await FacultySubjectMapping.create({
      facultyId: fac2._id,
      subjectId: subDS._id,
      classId: itY2Class._id,
      sectionId: itY2SecA._id,
      departmentId: deptIT._id,
      academicYearId: ayCurrent._id,
      year: itY2Class.year,
      semester: itY2Class.semester,
      isActive: true,
    });

    const classConflictRes = await makeRequest('/api/timetable', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        facultyMappingId: fac2Mapping._id.toString(),
        dayOfWeek: 'Saturday',
        period: 1,
        startTime: '09:00',
        endTime: '09:50',
        room: 'Lab-3',
      },
    });
    assert(
      classConflictRes.status === 409 &&
        classConflictRes.data?.message?.toLowerCase().includes('class timetable conflict'),
      'Conflict Check 2: Prevents Class/Section double-booking on same day & period (HTTP 409)',
      `Status: ${classConflictRes.status}, Error: ${classConflictRes.data?.message}`
    );

    // 3.6 Conflict Check 3: Room Conflict (HTTP 409)
    // 'Lab-2' is booked on Saturday Period 1 for IT Year 2.
    // Try to book CSE Year 3 into 'Lab-2' on Saturday Period 1 with fac2
    // First find CSE mapping for fac2
    const cseMapping = await FacultySubjectMapping.findOne({
      facultyId: fac2._id,
      classId: cseY3Class._id,
    });

    const roomConflictRes = await makeRequest('/api/timetable', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        facultyMappingId: cseMapping._id.toString(),
        dayOfWeek: 'Saturday',
        period: 1,
        startTime: '09:00',
        endTime: '09:50',
        room: 'Lab-2', // Conflicting room!
      },
    });
    assert(
      roomConflictRes.status === 409 &&
        roomConflictRes.data?.message?.toLowerCase().includes('room conflict'),
      'Conflict Check 3: Prevents Room double-booking on same day & period (HTTP 409)',
      `Status: ${roomConflictRes.status}, Error: ${roomConflictRes.data?.message}`
    );

    // 3.7 Time Validation: End time before start time (HTTP 400)
    const invalidTimeRes = await makeRequest('/api/timetable', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        facultyMappingId: cseMapping._id.toString(),
        dayOfWeek: 'Thursday',
        period: 5,
        startTime: '14:00',
        endTime: '13:00', // Invalid!
        room: 'LH-101',
      },
    });
    assert(
      invalidTimeRes.status === 400,
      'POST /api/timetable rejects endTime <= startTime (HTTP 400)',
      `Status: ${invalidTimeRes.status}`
    );

    // 3.8 Period Range Validation: Period > 10 (HTTP 400)
    const invalidPeriodRes = await makeRequest('/api/timetable', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        facultyMappingId: cseMapping._id.toString(),
        dayOfWeek: 'Thursday',
        period: 15, // Invalid!
        startTime: '09:00',
        endTime: '09:50',
      },
    });
    assert(
      invalidPeriodRes.status === 400,
      'POST /api/timetable rejects invalid period number > 10 (HTTP 400)'
    );

    // 3.9 Update Timetable Entry
    const updateTtRes = await makeRequest(`/api/timetable/${createdTtId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: {
        dayOfWeek: 'Saturday',
        period: 1,
        startTime: '09:15',
        endTime: '10:05',
        room: 'Lab-Updated',
      },
    });
    assert(
      updateTtRes.status === 200 && updateTtRes.data?.data?.room === 'Lab-Updated',
      'PUT /api/timetable/:id updates entry details'
    );

    // 3.10 Delete Timetable Entry
    const deleteTtRes = await makeRequest(`/api/timetable/${createdTtId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(
      deleteTtRes.status === 200,
      'DELETE /api/timetable/:id deletes timetable entry successfully'
    );

    // 3.11 Faculty Personal Timetable Endpoint
    const myTimetableRes = await makeRequest('/api/timetable/me', {
      headers: facultyHeaders,
    });
    assert(
      myTimetableRes.status === 200 &&
        myTimetableRes.data?.data?.weeklySchedule?.Monday?.length > 0 &&
        myTimetableRes.data?.data?.totalWeeklyPeriods > 0,
      'GET /api/timetable/me returns full weekly schedule for authenticated faculty'
    );

    // 3.12 Faculty Dashboard Summary Endpoint
    const dashSummaryRes = await makeRequest('/api/timetable/dashboard-summary', {
      headers: facultyHeaders,
    });
    assert(
      dashSummaryRes.status === 200 &&
        dashSummaryRes.data?.data?.assignedSubjectsCount > 0 &&
        dashSummaryRes.data?.data?.assignedClassesCount > 0 &&
        dashSummaryRes.data?.data?.weeklyPeriodsCount > 0 &&
        Array.isArray(dashSummaryRes.data?.data?.todayClasses),
      'GET /api/timetable/dashboard-summary returns live metrics & today classes for faculty dashboard'
    );

    // 3.13 RBAC: Student & Faculty Forbidden from Modifying Timetable
    const studentCreateTt = await makeRequest('/api/timetable', {
      method: 'POST',
      headers: studentHeaders,
      body: {
        facultyMappingId: cseMapping._id.toString(),
        dayOfWeek: 'Monday',
        period: 6,
        startTime: '14:00',
        endTime: '14:50',
      },
    });
    assert(
      studentCreateTt.status === 403,
      'POST /api/timetable returns 403 Forbidden for Student'
    );

    const facCreateTt = await makeRequest('/api/timetable', {
      method: 'POST',
      headers: facultyHeaders,
      body: {
        facultyMappingId: cseMapping._id.toString(),
        dayOfWeek: 'Monday',
        period: 6,
        startTime: '14:00',
        endTime: '14:50',
      },
    });
    assert(
      facCreateTt.status === 403,
      'POST /api/timetable returns 403 Forbidden for Faculty'
    );

    // Cleanup ephemeral mapping created during conflict testing
    await fac2Mapping.deleteOne();
  } catch (err) {
    console.error('💥 Unexpected test exception:', err);
    failed++;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await cleanupTestData();
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`Phase 4 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
