require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const { seedUsers } = require('./seed');
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
  console.log('🧪 Running Phase 2 Authentication & Authorization Tests');
  console.log('====================================================');

  await connectDB();
  await seedUsers(true);

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
    // 1. Anonymous request to /api/auth/me
    console.log('\n--- 1. Anonymous Requests ---');
    const anonMe = await makeRequest('/api/auth/me');
    assert(
      anonMe.status === 401 && anonMe.data?.success === false,
      'GET /api/auth/me returns 401 for unauthenticated request',
      `Got status ${anonMe.status}`
    );

    // 2. Admin Login
    console.log('\n--- 2. Valid Role Logins ---');
    const adminLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@attendance.local',
        password: 'AdminPassword123!',
      },
    });
    assert(
      adminLogin.status === 200 &&
      adminLogin.data?.success === true &&
      adminLogin.data?.data?.token &&
      adminLogin.data?.data?.user?.role === 'admin' &&
      adminLogin.data?.data?.user?.passwordHash === undefined,
      'Admin login succeeds with valid token, role=admin, and no passwordHash exposed',
      JSON.stringify(adminLogin.data)
    );
    const adminToken = adminLogin.data?.data?.token;

    // 3. Faculty Login
    const facultyLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'faculty@attendance.local',
        password: 'FacultyPassword123!',
      },
    });
    assert(
      facultyLogin.status === 200 &&
      facultyLogin.data?.data?.token &&
      facultyLogin.data?.data?.user?.role === 'faculty',
      'Faculty login succeeds with role=faculty',
      JSON.stringify(facultyLogin.data)
    );
    const facultyToken = facultyLogin.data?.data?.token;

    // 4. Student Login
    const studentLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'student@attendance.local',
        password: 'StudentPassword123!',
      },
    });
    assert(
      studentLogin.status === 200 &&
      studentLogin.data?.data?.token &&
      studentLogin.data?.data?.user?.role === 'student',
      'Student login succeeds with role=student',
      JSON.stringify(studentLogin.data)
    );
    const studentToken = studentLogin.data?.data?.token;

    // 5. Invalid Credentials Tests
    console.log('\n--- 3. Invalid Credentials & Validation ---');
    const wrongPass = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@attendance.local',
        password: 'WrongPassword!',
      },
    });
    assert(
      wrongPass.status === 401 && wrongPass.data?.success === false,
      'Wrong password returns 401',
      `Got ${wrongPass.status}: ${wrongPass.data?.message}`
    );

    const unknownUser = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'nonexistent@attendance.local',
        password: 'AnyPassword123!',
      },
    });
    assert(
      unknownUser.status === 401 && unknownUser.data?.success === false,
      'Unknown email returns 401',
      `Got ${unknownUser.status}`
    );

    const missingFields = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: '',
        password: '',
      },
    });
    assert(
      missingFields.status === 400 && missingFields.data?.success === false,
      'Empty credentials return 400 validation error',
      `Got ${missingFields.status}`
    );

    const malformedEmail = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'not-an-email',
        password: 'ValidPassword123!',
      },
    });
    assert(
      malformedEmail.status === 400 && malformedEmail.data?.success === false,
      'Malformed email returns 400 validation error',
      `Got ${malformedEmail.status}`
    );

    // 6. Inactive User Test
    console.log('\n--- 4. Inactive Account Behavior ---');
    await User.deleteOne({ email: 'inactive@attendance.local' });
    const inactiveUser = await User.create({
      name: 'Inactive Tester',
      email: 'inactive@attendance.local',
      passwordHash: await User.hashPassword('InactivePass123!'),
      role: 'student',
      isActive: false,
    });

    const inactiveLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'inactive@attendance.local',
        password: 'InactivePass123!',
      },
    });
    assert(
      inactiveLogin.status === 403 &&
      inactiveLogin.data?.message?.includes('inactive'),
      'Inactive user login returns 403 Forbidden with account inactive message',
      `Got ${inactiveLogin.status}: ${inactiveLogin.data?.message}`
    );
    await User.deleteOne({ email: 'inactive@attendance.local' });

    // 7. Token Verification & Current User API
    console.log('\n--- 5. GET /api/auth/me & Token Validation ---');
    const meAdmin = await makeRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      meAdmin.status === 200 &&
      meAdmin.data?.data?.user?.email === 'admin@attendance.local' &&
      meAdmin.data?.data?.user?.passwordHash === undefined,
      'GET /api/auth/me returns current user info for valid admin token',
      JSON.stringify(meAdmin.data)
    );

    const badToken = await makeRequest('/api/auth/me', {
      headers: { Authorization: 'Bearer this.is.an.invalid.token' },
    });
    assert(
      badToken.status === 401,
      'GET /api/auth/me returns 401 for invalid token',
      `Got ${badToken.status}`
    );

    // 8. Role-Based Authorization
    console.log('\n--- 6. Role Authorization Checks ---');
    // Admin route
    const adminOnAdmin = await makeRequest('/api/auth/test/admin', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminOnAdmin.status === 200,
      'Admin can access admin-only endpoint',
      `Got ${adminOnAdmin.status}`
    );

    const facultyOnAdmin = await makeRequest('/api/auth/test/admin', {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(
      facultyOnAdmin.status === 403,
      'Faculty cannot access admin-only endpoint (403 Forbidden)',
      `Got ${facultyOnAdmin.status}`
    );

    const studentOnAdmin = await makeRequest('/api/auth/test/admin', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentOnAdmin.status === 403,
      'Student cannot access admin-only endpoint (403 Forbidden)',
      `Got ${studentOnAdmin.status}`
    );

    // Faculty route
    const facultyOnFaculty = await makeRequest('/api/auth/test/faculty', {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(
      facultyOnFaculty.status === 200,
      'Faculty can access faculty-only endpoint',
      `Got ${facultyOnFaculty.status}`
    );

    const studentOnFaculty = await makeRequest('/api/auth/test/faculty', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentOnFaculty.status === 403,
      'Student cannot access faculty-only endpoint (403 Forbidden)',
      `Got ${studentOnFaculty.status}`
    );

    // Student route
    const studentOnStudent = await makeRequest('/api/auth/test/student', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentOnStudent.status === 200,
      'Student can access student-only endpoint',
      `Got ${studentOnStudent.status}`
    );

    // 9. Password Change Flow
    console.log('\n--- 7. Change Password Verification ---');
    // Wrong current password
    const wrongChange = await makeRequest('/api/auth/change-password', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: {
        currentPassword: 'WrongOldPassword!',
        newPassword: 'NewFacultyPassword123!',
      },
    });
    assert(
      wrongChange.status === 401,
      'change-password rejects incorrect current password (401)',
      `Got ${wrongChange.status}`
    );

    // Too short password
    const shortChange = await makeRequest('/api/auth/change-password', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: {
        currentPassword: 'FacultyPassword123!',
        newPassword: 'short',
      },
    });
    assert(
      shortChange.status === 400,
      'change-password rejects new password < 8 chars (400)',
      `Got ${shortChange.status}`
    );

    // Valid change
    const validChange = await makeRequest('/api/auth/change-password', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: {
        currentPassword: 'FacultyPassword123!',
        newPassword: 'UpdatedFacultyPassword123!',
      },
    });
    assert(
      validChange.status === 200 && validChange.data?.success === true,
      'change-password succeeds with valid input',
      JSON.stringify(validChange.data)
    );

    // Verify old password fails
    const oldPassLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'faculty@attendance.local',
        password: 'FacultyPassword123!',
      },
    });
    assert(
      oldPassLogin.status === 401,
      'Old password fails after password change',
      `Got ${oldPassLogin.status}`
    );

    // Verify new password succeeds
    const newPassLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'faculty@attendance.local',
        password: 'UpdatedFacultyPassword123!',
      },
    });
    assert(
      newPassLogin.status === 200,
      'New password succeeds after password change',
      `Got ${newPassLogin.status}`
    );

    // Reset password back to default for clean state
    const resetBack = await makeRequest('/api/auth/change-password', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${newPassLogin.data?.data?.token}` },
      body: {
        currentPassword: 'UpdatedFacultyPassword123!',
        newPassword: 'FacultyPassword123!',
      },
    });
    assert(
      resetBack.status === 200,
      'Reset password back to default seed password succeeded'
    );

    // 10. Logout Endpoint
    console.log('\n--- 8. Logout Endpoint ---');
    const logoutRes = await makeRequest('/api/auth/logout', {
      method: 'POST',
    });
    assert(
      logoutRes.status === 200 && logoutRes.data?.success === true,
      'POST /api/auth/logout returns 200',
      JSON.stringify(logoutRes.data)
    );

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
    await disconnectDB();
  }
};

runTests();
