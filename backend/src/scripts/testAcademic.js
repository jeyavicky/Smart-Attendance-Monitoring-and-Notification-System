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
const { seedUsers, seedAcademicMasterData } = require('./seed');
const app = require('../app');
const http = require('http');
const mongoose = require('mongoose');

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
  console.log('🧪 Running Phase 3 Academic Master Data Test Suite');
  console.log('====================================================');

  await connectDB();
  await seedUsers(true);
  await seedAcademicMasterData(true);

  const cleanupTestData = async () => {
    try {
      await AcademicYear.deleteMany({ name: { $in: ['2027-28', '2030-31'] } });
      await AcademicYear.findOneAndUpdate({ name: '2026-27' }, { isCurrent: true });
      await Department.deleteMany({ code: { $in: ['MECH', 'OFFLINE'] } });
      await Class.deleteMany({ name: { $in: ['B.Tech IT - Year 1 (Sem 1)', 'MECH Class', 'Invalid Class'] } });
      await Section.deleteMany({ name: 'C' });
      await Subject.deleteMany({ subjectCode: 'IT3101' });
      await Faculty.deleteMany({ employeeId: 'FAC999' });
      await Student.deleteMany({ registerNumber: { $in: ['23IT999', '23IT998', '23IT990'] } });
      await User.deleteMany({
        email: {
          $in: [
            'test_fac999@attendance.local',
            'renamed_fac999@attendance.local',
            'crossdept@attendance.local',
            'crosssec@attendance.local',
            'valid_stud990@attendance.local',
            'another_email@attendance.local',
          ],
        },
      });
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
  console.log(`[TestServer] Listening on ${baseUrl}`);

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${details}`);
      failed++;
    }
  };

  try {
    // 0. Authenticate test roles to obtain JWT tokens
    console.log('\n--- 0. Authentication & Tokens ---');
    const adminLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@attendance.local', password: 'AdminPassword123!' },
    });
    const adminToken = adminLogin.data?.data?.token;
    assert(Boolean(adminToken), 'Admin login succeeds and token generated');

    const facultyLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'faculty@attendance.local', password: 'FacultyPassword123!' },
    });
    const facultyToken = facultyLogin.data?.data?.token;
    assert(Boolean(facultyToken), 'Faculty login succeeds and token generated');

    const studentLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'student@attendance.local', password: 'StudentPassword123!' },
    });
    const studentToken = studentLogin.data?.data?.token;
    assert(Boolean(studentToken), 'Student login succeeds and token generated');

    // 1. RBAC Tests: Master Data Modification Protection
    console.log('\n--- 1. RBAC: Master Data Authorization ---');
    const studentTryCreateDept = await makeRequest('/api/departments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { code: 'TEST', name: 'Test Department' },
    });
    assert(
      studentTryCreateDept.status === 403,
      'Student cannot create department (403 Forbidden)',
      `Got status ${studentTryCreateDept.status}`
    );

    const facultyTryCreateAY = await makeRequest('/api/academic-years', {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: { name: '2030-31', startYear: 2030, endYear: 2031, startDate: '2030-06-01', endDate: '2031-05-31' },
    });
    assert(
      facultyTryCreateAY.status === 403,
      'Faculty cannot create academic year (403 Forbidden)',
      `Got status ${facultyTryCreateAY.status}`
    );

    const anonTryCreate = await makeRequest('/api/departments', {
      method: 'POST',
      body: { code: 'ANON', name: 'Anon Department' },
    });
    assert(
      anonTryCreate.status === 401,
      'Anonymous user cannot create department (401 Unauthorized)',
      `Got status ${anonTryCreate.status}`
    );

    // 2. Academic Year Module
    console.log('\n--- 2. Academic Year Module ---');
    const ayRes = await makeRequest('/api/academic-years', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: '2027-28',
        startYear: 2027,
        endYear: 2028,
        startDate: '2027-06-01',
        endDate: '2028-05-31',
        isCurrent: false,
      },
    });
    assert(
      ayRes.status === 201 && ayRes.data?.data?.name === '2027-28',
      'Admin creates new Academic Year successfully (201)',
      JSON.stringify(ayRes.data)
    );
    const createdAyId = ayRes.data?.data?.id;

    // Duplicate prevention
    const ayDup = await makeRequest('/api/academic-years', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: '2027-28',
        startYear: 2027,
        endYear: 2028,
        startDate: '2027-06-01',
        endDate: '2028-05-31',
      },
    });
    assert(
      ayDup.status === 409,
      'Duplicate Academic Year name rejected (409 Conflict)',
      `Got status ${ayDup.status}`
    );

    // Invalid dates check (startDate >= endDate)
    const ayBadDate = await makeRequest('/api/academic-years', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: '2028-29',
        startYear: 2028,
        endYear: 2029,
        startDate: '2028-06-01',
        endDate: '2028-05-01',
      },
    });
    assert(
      ayBadDate.status === 400,
      'Academic year rejected when end date precedes start date (400)',
      `Got status ${ayBadDate.status}`
    );

    // Set Current
    const aySetCurrent = await makeRequest(`/api/academic-years/${createdAyId}/set-current`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      aySetCurrent.status === 200 && aySetCurrent.data?.data?.isCurrent === true,
      'Set Academic Year as current succeeds',
      JSON.stringify(aySetCurrent.data)
    );

    // Check that previous current was unset
    const oldAy = await AcademicYear.findOne({ name: '2026-27' });
    assert(
      oldAy.isCurrent === false,
      'Previous academic year automatically unset from current',
      `2026-27 isCurrent: ${oldAy.isCurrent}`
    );

    // Reset 2026-27 back to current for consistent test state
    await AcademicYear.findOneAndUpdate({ name: '2026-27' }, { isCurrent: true });
    await AcademicYear.findByIdAndUpdate(createdAyId, { isCurrent: false });

    // 3. Department Module
    console.log('\n--- 3. Department Module ---');
    const deptRes = await makeRequest('/api/departments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        code: 'MECH',
        name: 'Mechanical Engineering',
        shortName: 'MECH',
      },
    });
    assert(
      deptRes.status === 201 && deptRes.data?.data?.code === 'MECH',
      'Admin creates Department successfully (201)',
      JSON.stringify(deptRes.data)
    );
    const createdDeptId = deptRes.data?.data?.id;

    // Duplicate Department code
    const deptDup = await makeRequest('/api/departments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        code: 'MECH',
        name: 'Different Name',
      },
    });
    assert(
      deptDup.status === 409,
      'Duplicate Department code rejected (409 Conflict)',
      `Got status ${deptDup.status}`
    );

    // Soft deactivation
    const deptDeactivate = await makeRequest(`/api/departments/${createdDeptId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { isActive: false },
    });
    assert(
      deptDeactivate.status === 200 && deptDeactivate.data?.data?.isActive === false,
      'Soft deactivation of Department succeeds',
      JSON.stringify(deptDeactivate.data)
    );

    // Block deletion if referenced by classes/students
    const itDept = await Department.findOne({ code: 'IT' });
    const deleteItDept = await makeRequest(`/api/departments/${itDept._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      deleteItDept.status === 400 && deleteItDept.data?.message?.includes('Dependencies exist'),
      'Hard deletion blocked when dependent records exist',
      deleteItDept.data?.message
    );

    // 4. Class Module
    console.log('\n--- 4. Class Module ---');
    const ay = await AcademicYear.findOne({ name: '2026-27' });

    // Invalid logical year-semester: Year 2 with Semester 7
    const badSemClass = await makeRequest('/api/classes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Invalid Class',
        departmentId: itDept._id.toString(),
        academicYearId: ay._id.toString(),
        year: 2,
        semester: 7,
      },
    });
    assert(
      badSemClass.status === 400 && badSemClass.data?.message?.includes('Invalid semester'),
      'Invalid Year-Semester combination rejected (e.g. Year 2 Sem 7)',
      badSemClass.data?.message
    );

    // Inactive Department rejected
    const inactiveDeptClass = await makeRequest('/api/classes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'MECH Class',
        departmentId: createdDeptId,
        academicYearId: ay._id.toString(),
        year: 1,
        semester: 1,
      },
    });
    assert(
      inactiveDeptClass.status === 400 && inactiveDeptClass.data?.message?.includes('inactive'),
      'Class creation under inactive department rejected',
      inactiveDeptClass.data?.message
    );

    // Valid Class creation
    const validClass = await makeRequest('/api/classes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'B.Tech IT - Year 1 (Sem 1)',
        programme: 'B.Tech',
        departmentId: itDept._id.toString(),
        academicYearId: ay._id.toString(),
        year: 1,
        semester: 1,
      },
    });
    assert(
      validClass.status === 201 && validClass.data?.data?.year === 1,
      'Valid Class cohort created successfully (201)',
      JSON.stringify(validClass.data)
    );
    const createdClassId = validClass.data?.data?.id;

    // 5. Section Module
    console.log('\n--- 5. Section Module ---');
    const validSection = await makeRequest('/api/sections', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'A',
        classId: createdClassId,
        capacity: 50,
      },
    });
    assert(
      validSection.status === 201 && validSection.data?.data?.name === 'A',
      'Valid Section created successfully (201)',
      JSON.stringify(validSection.data)
    );

    // Duplicate Section name in same class
    const dupSection = await makeRequest('/api/sections', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'A',
        classId: createdClassId,
      },
    });
    assert(
      dupSection.status === 409,
      'Duplicate Section name in same class cohort rejected (409 Conflict)',
      `Got status ${dupSection.status}`
    );

    // 6. Subject Module
    console.log('\n--- 6. Subject Module ---');
    const validSubject = await makeRequest('/api/subjects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        subjectCode: 'IT3101',
        subjectName: 'Problem Solving and Python Programming',
        departmentId: itDept._id.toString(),
        academicYearId: ay._id.toString(),
        year: 1,
        semester: 1,
        subjectType: 'Core',
        credits: 4,
      },
    });
    assert(
      validSubject.status === 201 && validSubject.data?.data?.subjectCode === 'IT3101',
      'Valid Subject created successfully (201)',
      JSON.stringify(validSubject.data)
    );

    // Duplicate Subject code
    const dupSubject = await makeRequest('/api/subjects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        subjectCode: 'IT3101',
        subjectName: 'Different Name',
        departmentId: itDept._id.toString(),
        academicYearId: ay._id.toString(),
        year: 1,
        semester: 1,
      },
    });
    assert(
      dupSubject.status === 409,
      'Duplicate Subject code rejected (409 Conflict)',
      `Got status ${dupSubject.status}`
    );

    // 7. Faculty Module & User Synchronization
    console.log('\n--- 7. Faculty Module & Linked User Sync ---');
    const newFaculty = await makeRequest('/api/faculty', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        employeeId: 'FAC999',
        name: 'Dr. Test Professor',
        email: 'test_fac999@attendance.local',
        departmentId: itDept._id.toString(),
        designation: 'Assistant Professor',
        initialPassword: 'TestFacPassword123!',
      },
    });
    assert(
      newFaculty.status === 201 && newFaculty.data?.data?.employeeId === 'FAC999',
      'Faculty profile and linked User created successfully in one transaction (201)',
      JSON.stringify(newFaculty.data)
    );
    const createdFacId = newFaculty.data?.data?.id;

    // Verify linked User exists with role: faculty
    const linkedFacUser = await User.findOne({ email: 'test_fac999@attendance.local' });
    assert(
      linkedFacUser && linkedFacUser.role === 'faculty',
      'Linked User created with role: faculty'
    );

    // Update faculty name/email and verify sync to linked User
    const updateFac = await makeRequest(`/api/faculty/${createdFacId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Dr. Renamed Professor',
        email: 'renamed_fac999@attendance.local',
      },
    });
    assert(
      updateFac.status === 200 && updateFac.data?.data?.name === 'Dr. Renamed Professor',
      'Faculty profile updated successfully'
    );
    const updatedFacUser = await User.findById(linkedFacUser._id);
    assert(
      updatedFacUser.name === 'Dr. Renamed Professor' && updatedFacUser.email === 'renamed_fac999@attendance.local',
      'Linked User synchronized on Faculty profile update'
    );

    // Deactivate faculty and verify User.isActive is synchronized to false
    const deactFac = await makeRequest(`/api/faculty/${createdFacId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { isActive: false },
    });
    assert(
      deactFac.status === 200 && deactFac.data?.data?.isActive === false,
      'Faculty deactivated successfully'
    );
    const deactFacUser = await User.findById(linkedFacUser._id);
    assert(
      deactFacUser.isActive === false,
      'Linked User deactivated when Faculty profile deactivated'
    );

    // 8. Student Module & Relationship Validation
    console.log('\n--- 8. Student Module & Relationship Enforcement ---');
    const itClass = await Class.findOne({ name: 'B.Tech IT - Year 3 (Sem 5)' });
    const cseClass = await Class.findOne({ name: 'B.Tech CSE - Year 3 (Sem 5)' });
    const itSec = await Section.findOne({ classId: itClass._id, name: 'A' });
    const cseSec = await Section.findOne({ classId: cseClass._id, name: 'A' });

    // Invalid Relationship: IT Student assigned to CSE Class
    const crossDeptStudent = await makeRequest('/api/students', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        registerNumber: '23IT999',
        name: 'Cross Dept Tester',
        email: 'crossdept@attendance.local',
        departmentId: itDept._id.toString(),
        academicYearId: ay._id.toString(),
        classId: cseClass._id.toString(), // CSE Class for IT student!
        sectionId: itSec._id.toString(),
        year: 3,
        semester: 5,
      },
    });
    assert(
      crossDeptStudent.status === 400 && crossDeptStudent.data?.message?.includes('Cross-department'),
      'Cross-department class assignment rejected (400)',
      crossDeptStudent.data?.message
    );

    // Invalid Relationship: Section does not belong to Class
    const crossSectionStudent = await makeRequest('/api/students', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        registerNumber: '23IT998',
        name: 'Cross Section Tester',
        email: 'crosssec@attendance.local',
        departmentId: itDept._id.toString(),
        academicYearId: ay._id.toString(),
        classId: itClass._id.toString(),
        sectionId: cseSec._id.toString(), // CSE Section for IT Class!
        year: 3,
        semester: 5,
      },
    });
    assert(
      crossSectionStudent.status === 400 && crossSectionStudent.data?.message?.includes('Section'),
      'Cross-class section assignment rejected (400)',
      crossSectionStudent.data?.message
    );

    // Valid Student Creation
    const validStudent = await makeRequest('/api/students', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        registerNumber: '23IT990',
        name: 'Valid Student Test',
        email: 'valid_stud990@attendance.local',
        departmentId: itDept._id.toString(),
        academicYearId: ay._id.toString(),
        classId: itClass._id.toString(),
        sectionId: itSec._id.toString(),
        year: 3,
        semester: 5,
        gender: 'Male',
        initialPassword: 'StudentPassword123!',
      },
    });
    assert(
      validStudent.status === 201 && validStudent.data?.data?.registerNumber === '23IT990',
      'Valid Student profile and linked User created (201)',
      JSON.stringify(validStudent.data)
    );
    const createdStudId = validStudent.data?.data?.id;

    // Duplicate registerNumber check
    const dupReg = await makeRequest('/api/students', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        registerNumber: '23IT990',
        name: 'Duplicate Reg Tester',
        email: 'another_email@attendance.local',
        departmentId: itDept._id.toString(),
        academicYearId: ay._id.toString(),
        classId: itClass._id.toString(),
        sectionId: itSec._id.toString(),
        year: 3,
        semester: 5,
      },
    });
    assert(
      dupReg.status === 409,
      'Duplicate Register Number rejected (409 Conflict)',
      `Got status ${dupReg.status}`
    );

    // Deactivate student and check User.isActive sync
    const deactStud = await makeRequest(`/api/students/${createdStudId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { isActive: false },
    });
    assert(
      deactStud.status === 200 && deactStud.data?.data?.isActive === false,
      'Student deactivated successfully'
    );
    const linkedStudUser = await User.findOne({ email: 'valid_stud990@attendance.local' });
    assert(
      linkedStudUser.isActive === false,
      'Linked User deactivated when Student profile deactivated'
    );

    // 9. Dashboard APIs
    console.log('\n--- 9. Dashboard APIs ---');
    const adminSummary = await makeRequest('/api/admin/dashboard/summary', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminSummary.status === 200 &&
      adminSummary.data?.data?.students >= 20 &&
      adminSummary.data?.data?.faculty >= 3 &&
      adminSummary.data?.data?.departments >= 3 &&
      adminSummary.data?.data?.subjects >= 7 &&
      adminSummary.data?.data?.classes >= 3,
      'Admin dashboard summary returns real database metrics',
      JSON.stringify(adminSummary.data)
    );

    // Faculty tries to access admin summary
    const facultyTryAdminSummary = await makeRequest('/api/admin/dashboard/summary', {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(
      facultyTryAdminSummary.status === 403,
      'Faculty cannot access admin dashboard summary (403 Forbidden)',
      `Got status ${facultyTryAdminSummary.status}`
    );

    // Faculty Profile Me
    const facultyProfile = await makeRequest('/api/faculty/profile/me', {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(
      facultyProfile.status === 200 &&
      facultyProfile.data?.data?.employeeId === 'FAC001' &&
      facultyProfile.data?.data?.departmentId?.code === 'IT',
      'Faculty gets real profile details at /api/faculty/profile/me',
      JSON.stringify(facultyProfile.data)
    );

    // Student Profile Me
    const studentProfile = await makeRequest('/api/student/profile/me', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentProfile.status === 200 &&
      studentProfile.data?.data?.registerNumber === '23IT001' &&
      studentProfile.data?.data?.departmentId?.code === 'IT',
      'Student gets real profile details at /api/student/profile/me',
      JSON.stringify(studentProfile.data)
    );

    // 10. Database Fallback Test (Section 58)
    console.log('\n--- 10. Database Service Guard (No Silent Fallback) ---');
    // Temporarily simulate disconnected readyState
    const originalDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState') || {
      value: mongoose.connection.readyState,
      writable: true,
      configurable: true,
    };
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true, writable: true });

    const offlineDeptTry = await makeRequest('/api/departments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { code: 'OFFLINE', name: 'Offline Dept' },
    });
    assert(
      offlineDeptTry.status === 503 && offlineDeptTry.data?.message?.includes('Database service unavailable'),
      'Database disconnection rejects master data write with 503 instead of silent in-memory fallback',
      offlineDeptTry.data?.message
    );

    // Restore readyState
    Object.defineProperty(mongoose.connection, 'readyState', originalDescriptor);

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await cleanupTestData();
    await disconnectDB();
  }
};

runTests();
