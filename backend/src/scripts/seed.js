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
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');
const { ROLES, ATTENDANCE_STATUS, SESSION_STATUS } = require('../config/constants');

const SEED_USERS = [
  {
    name: 'System Admin',
    email: 'admin@attendance.local',
    password: process.env.DEV_ADMIN_PASSWORD || 'AdminPassword123!',
    role: ROLES.ADMIN,
    isActive: true,
  },
  {
    name: 'Demo Faculty',
    email: 'faculty@attendance.local',
    password: process.env.DEV_FACULTY_PASSWORD || 'FacultyPassword123!',
    role: ROLES.FACULTY,
    isActive: true,
  },
  {
    name: 'Demo Student',
    email: 'student@attendance.local',
    password: process.env.DEV_STUDENT_PASSWORD || 'StudentPassword123!',
    role: ROLES.STUDENT,
    isActive: true,
  },
];

/**
 * Seed users into database idempotently
 */
const seedUsers = async (silent = false) => {
  const results = [];

  for (const seedData of SEED_USERS) {
    const existingUser = await User.findOne({ email: seedData.email });

    if (existingUser) {
      if (!silent) {
        console.log(`[Seed] User exists: ${seedData.email} (${seedData.role}) - Skipped`);
      }
      results.push({ email: seedData.email, status: 'exists', user: existingUser });
    } else {
      const passwordHash = await User.hashPassword(seedData.password);
      const newUser = await User.create({
        name: seedData.name,
        email: seedData.email,
        passwordHash,
        role: seedData.role,
        isActive: seedData.isActive,
      });

      if (!silent) {
        console.log(`[Seed] Created user: ${seedData.email} (${seedData.role})`);
      }
      results.push({ email: seedData.email, status: 'created', user: newUser });
    }
  }

  return results;
};

/**
 * Seed Academic Master Data (Phase 3)
 */
const seedAcademicMasterData = async (silent = false) => {
  const adminUser = await User.findOne({ role: ROLES.ADMIN });
  const adminId = adminUser ? adminUser._id : null;

  // 1. Seed Academic Year: 2026-27
  let ay2627 = await AcademicYear.findOne({ name: '2026-27' });
  if (!ay2627) {
    ay2627 = await AcademicYear.create({
      name: '2026-27',
      startYear: 2026,
      endYear: 2027,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-05-31'),
      isCurrent: true,
      isActive: true,
      createdBy: adminId,
    });
    if (!silent) console.log('[Seed] Created Academic Year: 2026-27');
  }

  // 2. Seed Departments: IT, CSE, ECE
  const deptData = [
    { code: 'IT', name: 'Information Technology', shortName: 'IT' },
    { code: 'CSE', name: 'Computer Science and Engineering', shortName: 'CSE' },
    { code: 'ECE', name: 'Electronics and Communication Engineering', shortName: 'ECE' },
  ];

  const departments = {};
  for (const d of deptData) {
    let dept = await Department.findOne({ code: d.code });
    if (!dept) {
      dept = await Department.create({ ...d, createdBy: adminId });
      if (!silent) console.log(`[Seed] Created Department: ${d.code} - ${d.name}`);
    }
    departments[d.code] = dept;
  }

  // 3. Seed Classes:
  // - B.Tech IT - Year 3 (Sem 5)
  // - B.Tech CSE - Year 3 (Sem 5)
  // - B.Tech IT - Year 2 (Sem 3)
  const classConfigs = [
    {
      name: 'B.Tech IT - Year 3 (Sem 5)',
      programme: 'B.Tech',
      departmentId: departments['IT']._id,
      academicYearId: ay2627._id,
      year: 3,
      semester: 5,
    },
    {
      name: 'B.Tech CSE - Year 3 (Sem 5)',
      programme: 'B.Tech',
      departmentId: departments['CSE']._id,
      academicYearId: ay2627._id,
      year: 3,
      semester: 5,
    },
    {
      name: 'B.Tech IT - Year 2 (Sem 3)',
      programme: 'B.Tech',
      departmentId: departments['IT']._id,
      academicYearId: ay2627._id,
      year: 2,
      semester: 3,
    },
  ];

  const classes = {};
  for (const c of classConfigs) {
    let classItem = await Class.findOne({
      departmentId: c.departmentId,
      academicYearId: c.academicYearId,
      programme: c.programme,
      year: c.year,
      semester: c.semester,
    });
    if (!classItem) {
      classItem = await Class.create({ ...c, createdBy: adminId });
      if (!silent) console.log(`[Seed] Created Class: ${c.name}`);
    }
    classes[`${c.programme}_${c.year}_${c.semester}_${c.departmentId}`] = classItem;
  }

  const itYear3Class = classes[`B.Tech_3_5_${departments['IT']._id}`];
  const cseYear3Class = classes[`B.Tech_3_5_${departments['CSE']._id}`];
  const itYear2Class = classes[`B.Tech_2_3_${departments['IT']._id}`];

  // 4. Seed Sections:
  // IT Year 3: Sec A, Sec B
  // CSE Year 3: Sec A, Sec B
  // IT Year 2: Sec A
  const sectionConfigs = [
    { name: 'A', classItem: itYear3Class, dept: departments['IT'] },
    { name: 'B', classItem: itYear3Class, dept: departments['IT'] },
    { name: 'A', classItem: cseYear3Class, dept: departments['CSE'] },
    { name: 'B', classItem: cseYear3Class, dept: departments['CSE'] },
    { name: 'A', classItem: itYear2Class, dept: departments['IT'] },
  ];

  const sections = {};
  for (const sec of sectionConfigs) {
    let section = await Section.findOne({ classId: sec.classItem._id, name: sec.name });
    if (!section) {
      section = await Section.create({
        name: sec.name,
        code: `${sec.dept.code}-${sec.classItem.year}-${sec.classItem.semester}-${sec.name}`,
        classId: sec.classItem._id,
        departmentId: sec.dept._id,
        academicYearId: ay2627._id,
        year: sec.classItem.year,
        semester: sec.classItem.semester,
        capacity: 60,
        createdBy: adminId,
      });
      if (!silent) console.log(`[Seed] Created Section: ${sec.dept.code} Year ${sec.classItem.year} Sem ${sec.classItem.semester} Sec ${sec.name}`);
    }
    sections[`${sec.classItem._id}_${sec.name}`] = section;
  }

  // 5. Seed Subjects
  const subjectConfigs = [
    {
      subjectCode: 'IT3501',
      subjectName: 'Database Management Systems',
      departmentId: departments['IT']._id,
      academicYearId: ay2627._id,
      year: 3,
      semester: 5,
      subjectType: 'Core',
      credits: 3,
    },
    {
      subjectCode: 'IT3502',
      subjectName: 'Operating Systems',
      departmentId: departments['IT']._id,
      academicYearId: ay2627._id,
      year: 3,
      semester: 5,
      subjectType: 'Core',
      credits: 3,
    },
    {
      subjectCode: 'IT3503',
      subjectName: 'Computer Networks',
      departmentId: departments['IT']._id,
      academicYearId: ay2627._id,
      year: 3,
      semester: 5,
      subjectType: 'Core',
      credits: 3,
    },
    {
      subjectCode: 'IT3504',
      subjectName: 'Full Stack Development',
      departmentId: departments['IT']._id,
      academicYearId: ay2627._id,
      year: 3,
      semester: 5,
      subjectType: 'Core',
      credits: 4,
    },
    {
      subjectCode: 'CS3501',
      subjectName: 'Design and Analysis of Algorithms',
      departmentId: departments['CSE']._id,
      academicYearId: ay2627._id,
      year: 3,
      semester: 5,
      subjectType: 'Core',
      credits: 4,
    },
    {
      subjectCode: 'CS3502',
      subjectName: 'Theory of Computation',
      departmentId: departments['CSE']._id,
      academicYearId: ay2627._id,
      year: 3,
      semester: 5,
      subjectType: 'Core',
      credits: 3,
    },
    {
      subjectCode: 'IT3301',
      subjectName: 'Data Structures and Algorithms',
      departmentId: departments['IT']._id,
      academicYearId: ay2627._id,
      year: 2,
      semester: 3,
      subjectType: 'Core',
      credits: 4,
    },
  ];

  for (const s of subjectConfigs) {
    let subject = await Subject.findOne({ subjectCode: s.subjectCode });
    if (!subject) {
      subject = await Subject.create({ ...s, createdBy: adminId });
      if (!silent) console.log(`[Seed] Created Subject: ${s.subjectCode} - ${s.subjectName}`);
    }
  }

  // 6. Seed Faculty Profiles
  // Link existing faculty@attendance.local
  const facultyUser = await User.findOne({ email: 'faculty@attendance.local' });
  if (facultyUser) {
    const existingProfile = await Faculty.findOne({ userId: facultyUser._id });
    if (!existingProfile) {
      await Faculty.create({
        userId: facultyUser._id,
        employeeId: 'FAC001',
        name: facultyUser.name,
        email: facultyUser.email,
        phone: '9876543210',
        departmentId: departments['IT']._id,
        designation: 'Assistant Professor',
        qualification: 'M.Tech, Ph.D',
        isActive: true,
        createdBy: adminId,
      });
      if (!silent) console.log('[Seed] Linked Faculty profile for: faculty@attendance.local (FAC001)');
    }
  }

  // Add 2 additional faculty members
  const extraFaculty = [
    {
      employeeId: 'FAC002',
      name: 'Dr. R. Kumar',
      email: 'fac_kumar@attendance.local',
      phone: '9876543211',
      deptCode: 'CSE',
      designation: 'Associate Professor',
      qualification: 'Ph.D in Computer Science',
    },
    {
      employeeId: 'FAC003',
      name: 'Dr. P. Sharma',
      email: 'fac_sharma@attendance.local',
      phone: '9876543212',
      deptCode: 'IT',
      designation: 'Professor & Head',
      qualification: 'Ph.D in Information Tech',
    },
  ];

  for (const ef of extraFaculty) {
    let fUser = await User.findOne({ email: ef.email });
    if (!fUser) {
      const passwordHash = await User.hashPassword('FacultyPassword123!');
      fUser = await User.create({
        name: ef.name,
        email: ef.email,
        passwordHash,
        role: ROLES.FACULTY,
        isActive: true,
      });
    }

    const fProfile = await Faculty.findOne({ employeeId: ef.employeeId });
    if (!fProfile) {
      await Faculty.create({
        userId: fUser._id,
        employeeId: ef.employeeId,
        name: ef.name,
        email: ef.email,
        phone: ef.phone,
        departmentId: departments[ef.deptCode]._id,
        designation: ef.designation,
        qualification: ef.qualification,
        isActive: true,
        createdBy: adminId,
      });
      if (!silent) console.log(`[Seed] Created Faculty member: ${ef.name} (${ef.employeeId})`);
    }
  }

  // 7. Seed Student Profiles (25 students total across IT & CSE)
  // Link existing student@attendance.local as 23IT001
  const studentUser = await User.findOne({ email: 'student@attendance.local' });
  const itSecA = sections[`${itYear3Class._id}_A`];
  const itSecB = sections[`${itYear3Class._id}_B`];
  const cseSecA = sections[`${cseYear3Class._id}_A`];
  const cseSecB = sections[`${cseYear3Class._id}_B`];

  if (studentUser && itSecA) {
    const existingStudent = await Student.findOne({ userId: studentUser._id });
    if (!existingStudent) {
      await Student.create({
        userId: studentUser._id,
        registerNumber: '23IT001',
        name: studentUser.name,
        email: studentUser.email,
        phone: '9123456780',
        departmentId: departments['IT']._id,
        academicYearId: ay2627._id,
        classId: itYear3Class._id,
        sectionId: itSecA._id,
        year: 3,
        semester: 5,
        dateOfBirth: new Date('2005-04-15'),
        gender: 'Male',
        isActive: true,
        createdBy: adminId,
      });
      if (!silent) console.log('[Seed] Linked Student profile for: student@attendance.local (23IT001)');
    }
  }

  // Additional 24 students (Total 25 students, meeting requirement: 20-30 students)
  const studentNames = [
    { reg: '23IT002', name: 'Aarav Patel', gender: 'Male', dept: 'IT', cls: itYear3Class, sec: itSecA },
    { reg: '23IT003', name: 'Ananya Iyer', gender: 'Female', dept: 'IT', cls: itYear3Class, sec: itSecA },
    { reg: '23IT004', name: 'Bhavna Sharma', gender: 'Female', dept: 'IT', cls: itYear3Class, sec: itSecA },
    { reg: '23IT005', name: 'Chetan Rao', gender: 'Male', dept: 'IT', cls: itYear3Class, sec: itSecA },
    { reg: '23IT006', name: 'Deepak Varma', gender: 'Male', dept: 'IT', cls: itYear3Class, sec: itSecA },
    { reg: '23IT007', name: 'Divya Nair', gender: 'Female', dept: 'IT', cls: itYear3Class, sec: itSecA },
    { reg: '23IT008', name: 'Gautam Menon', gender: 'Male', dept: 'IT', cls: itYear3Class, sec: itSecB },
    { reg: '23IT009', name: 'Harini Sundar', gender: 'Female', dept: 'IT', cls: itYear3Class, sec: itSecB },
    { reg: '23IT010', name: 'Ishaan Gupta', gender: 'Male', dept: 'IT', cls: itYear3Class, sec: itSecB },
    { reg: '23IT011', name: 'Kavya Pillai', gender: 'Female', dept: 'IT', cls: itYear3Class, sec: itSecB },
    { reg: '23IT012', name: 'Madhavan K', gender: 'Male', dept: 'IT', cls: itYear3Class, sec: itSecB },
    { reg: '23IT013', name: 'Nandini Joshi', gender: 'Female', dept: 'IT', cls: itYear3Class, sec: itSecB },
    { reg: '23IT014', name: 'Pranav Reddy', gender: 'Male', dept: 'IT', cls: itYear3Class, sec: itSecB },
    { reg: '23IT015', name: 'Riya Sen', gender: 'Female', dept: 'IT', cls: itYear3Class, sec: itSecB },
    { reg: '23CS001', name: 'Aditya Roy', gender: 'Male', dept: 'CSE', cls: cseYear3Class, sec: cseSecA },
    { reg: '23CS002', name: 'Gayathri Raman', gender: 'Female', dept: 'CSE', cls: cseYear3Class, sec: cseSecA },
    { reg: '23CS003', name: 'Karthik Raja', gender: 'Male', dept: 'CSE', cls: cseYear3Class, sec: cseSecA },
    { reg: '23CS004', name: 'Meera Krishnan', gender: 'Female', dept: 'CSE', cls: cseYear3Class, sec: cseSecA },
    { reg: '23CS005', name: 'Nikhil Chandran', gender: 'Male', dept: 'CSE', cls: cseYear3Class, sec: cseSecA },
    { reg: '23CS006', name: 'Pooja Hegde', gender: 'Female', dept: 'CSE', cls: cseYear3Class, sec: cseSecB },
    { reg: '23CS007', name: 'Rahul Bose', gender: 'Male', dept: 'CSE', cls: cseYear3Class, sec: cseSecB },
    { reg: '23CS008', name: 'Sneha Deshmukh', gender: 'Female', dept: 'CSE', cls: cseYear3Class, sec: cseSecB },
    { reg: '23CS009', name: 'Tarun Saxena', gender: 'Male', dept: 'CSE', cls: cseYear3Class, sec: cseSecB },
    { reg: '23CS010', name: 'Varun Nair', gender: 'Male', dept: 'CSE', cls: cseYear3Class, sec: cseSecB },
  ];

  let studentCreatedCount = 0;
  for (const s of studentNames) {
    const sEmail = `${s.reg.toLowerCase()}@attendance.local`;
    let sUser = await User.findOne({ email: sEmail });
    if (!sUser) {
      const passwordHash = await User.hashPassword('StudentPassword123!');
      sUser = await User.create({
        name: s.name,
        email: sEmail,
        passwordHash,
        role: ROLES.STUDENT,
        isActive: true,
      });
    }

    let sProfile = await Student.findOne({ registerNumber: s.reg });
    if (!sProfile) {
      await Student.create({
        userId: sUser._id,
        registerNumber: s.reg,
        name: s.name,
        email: sEmail,
        phone: '9800000000',
        departmentId: departments[s.dept]._id,
        academicYearId: ay2627._id,
        classId: s.cls._id,
        sectionId: s.sec._id,
        year: s.cls.year,
        semester: s.cls.semester,
        dateOfBirth: new Date('2005-01-01'),
        gender: s.gender,
        isActive: true,
        createdBy: adminId,
      });
      studentCreatedCount++;
    }
  }

  if (!silent && studentCreatedCount > 0) {
    console.log(`[Seed] Seeded ${studentCreatedCount} cohort student records successfully`);
  }
};

/**
 * Seed Faculty Subject Mappings and Timetable Entries (Phase 4)
 */
const seedFacultyMappingsAndTimetable = async (silent = false) => {
  const adminUser = await User.findOne({ email: 'admin@attendance.local' });
  const adminId = adminUser ? adminUser._id : null;

  const [fac1, fac2, fac3] = await Promise.all([
    Faculty.findOne({ employeeId: 'FAC001' }),
    Faculty.findOne({ employeeId: 'FAC002' }),
    Faculty.findOne({ employeeId: 'FAC003' }),
  ]);

  if (!fac1 || !fac2) {
    if (!silent) console.log('[Seed] Required faculty records not found. Skipping mapping seed.');
    return;
  }

  const [deptIT, deptCSE] = await Promise.all([
    Department.findOne({ code: 'IT' }),
    Department.findOne({ code: 'CSE' }),
  ]);

  const currentAy = await AcademicYear.findOne({ isCurrent: true });
  if (!currentAy || !deptIT || !deptCSE) {
    if (!silent) console.log('[Seed] Academic year or departments missing. Skipping mapping seed.');
    return;
  }

  // Find classes
  const [itClass, cseClass] = await Promise.all([
    Class.findOne({ departmentId: deptIT._id, year: 3, semester: 5 }),
    Class.findOne({ departmentId: deptCSE._id, year: 3, semester: 5 }),
  ]);

  if (!itClass || !cseClass) {
    if (!silent) console.log('[Seed] Cohort classes not found. Skipping mapping seed.');
    return;
  }

  // Find sections
  const [itSecA, itSecB, cseSecA] = await Promise.all([
    Section.findOne({ classId: itClass._id, name: 'A' }),
    Section.findOne({ classId: itClass._id, name: 'B' }),
    Section.findOne({ classId: cseClass._id, name: 'A' }),
  ]);

  if (!itSecA || !itSecB || !cseSecA) {
    if (!silent) console.log('[Seed] Cohort sections not found. Skipping mapping seed.');
    return;
  }

  // Find subjects
  const [subDBMS, subWT, subCN, subAlgo, subOS] = await Promise.all([
    Subject.findOne({ subjectCode: 'IT3501' }),
    Subject.findOne({ subjectCode: 'IT3504' }),
    Subject.findOne({ subjectCode: 'IT3503' }),
    Subject.findOne({ subjectCode: 'CS3501' }),
    Subject.findOne({ subjectCode: 'CS3502' }),
  ]);

  // 1. Seed Faculty Subject Mappings
  const mappingDefs = [
    // FAC001 (Demo Faculty - IT)
    {
      facultyId: fac1._id,
      subjectId: subDBMS?._id,
      classId: itClass._id,
      sectionId: itSecA._id,
      departmentId: deptIT._id,
      academicYearId: currentAy._id,
      year: itClass.year,
      semester: itClass.semester,
    },
    {
      facultyId: fac1._id,
      subjectId: subWT?._id,
      classId: itClass._id,
      sectionId: itSecA._id,
      departmentId: deptIT._id,
      academicYearId: currentAy._id,
      year: itClass.year,
      semester: itClass.semester,
    },
    {
      facultyId: fac1._id,
      subjectId: subWT?._id,
      classId: itClass._id,
      sectionId: itSecB._id,
      departmentId: deptIT._id,
      academicYearId: currentAy._id,
      year: itClass.year,
      semester: itClass.semester,
    },
    // FAC002 (Dr. R. Kumar - CSE)
    {
      facultyId: fac2._id,
      subjectId: subAlgo?._id,
      classId: cseClass._id,
      sectionId: cseSecA._id,
      departmentId: deptCSE._id,
      academicYearId: currentAy._id,
      year: cseClass.year,
      semester: cseClass.semester,
    },
    {
      facultyId: fac2._id,
      subjectId: subOS?._id,
      classId: cseClass._id,
      sectionId: cseSecA._id,
      departmentId: deptCSE._id,
      academicYearId: currentAy._id,
      year: cseClass.year,
      semester: cseClass.semester,
    },
  ];

  if (fac3 && subCN) {
    mappingDefs.push({
      facultyId: fac3._id,
      subjectId: subCN._id,
      classId: itClass._id,
      sectionId: itSecA._id,
      departmentId: deptIT._id,
      academicYearId: currentAy._id,
      year: itClass.year,
      semester: itClass.semester,
    });
  }

  const createdMappings = {};
  for (const def of mappingDefs) {
    if (!def.subjectId) continue;
    let existing = await FacultySubjectMapping.findOne({
      facultyId: def.facultyId,
      subjectId: def.subjectId,
      classId: def.classId,
      sectionId: def.sectionId,
      academicYearId: def.academicYearId,
    });

    if (!existing) {
      existing = await FacultySubjectMapping.create({
        ...def,
        isActive: true,
        createdBy: adminId,
      });
      if (!silent) console.log(`[Seed] Created Faculty Mapping for Faculty ID: ${def.facultyId}`);
    }
    const key = `${def.facultyId}_${def.subjectId}_${def.classId}_${def.sectionId}`;
    createdMappings[key] = existing;
  }

  // 2. Seed Weekly Timetable Entries
  const mFac1DBMS_A = createdMappings[`${fac1._id}_${subDBMS?._id}_${itClass._id}_${itSecA._id}`];
  const mFac1WT_A = createdMappings[`${fac1._id}_${subWT?._id}_${itClass._id}_${itSecA._id}`];
  const mFac1WT_B = createdMappings[`${fac1._id}_${subWT?._id}_${itClass._id}_${itSecB._id}`];
  const mFac2Algo_A = createdMappings[`${fac2._id}_${subAlgo?._id}_${cseClass._id}_${cseSecA._id}`];
  const mFac2OS_A = createdMappings[`${fac2._id}_${subOS?._id}_${cseClass._id}_${cseSecA._id}`];

  const timetableDefs = [
    // Monday
    mFac1DBMS_A && { mapping: mFac1DBMS_A, day: 'Monday', period: 1, start: '09:00', end: '09:50', room: 'Lab-1' },
    mFac1WT_A && { mapping: mFac1WT_A, day: 'Monday', period: 2, start: '09:50', end: '10:40', room: 'CS-101' },
    mFac2Algo_A && { mapping: mFac2Algo_A, day: 'Monday', period: 1, start: '09:00', end: '09:50', room: 'LH-201' },
    mFac2OS_A && { mapping: mFac2OS_A, day: 'Monday', period: 3, start: '10:55', end: '11:45', room: 'LH-201' },

    // Tuesday
    mFac1DBMS_A && { mapping: mFac1DBMS_A, day: 'Tuesday', period: 2, start: '09:50', end: '10:40', room: 'Lab-1' },
    mFac1WT_B && { mapping: mFac1WT_B, day: 'Tuesday', period: 3, start: '10:55', end: '11:45', room: 'CS-102' },
    mFac2OS_A && { mapping: mFac2OS_A, day: 'Tuesday', period: 1, start: '09:00', end: '09:50', room: 'LH-201' },

    // Wednesday
    mFac1WT_A && { mapping: mFac1WT_A, day: 'Wednesday', period: 1, start: '09:00', end: '09:50', room: 'CS-101' },
    mFac1WT_B && { mapping: mFac1WT_B, day: 'Wednesday', period: 4, start: '11:45', end: '12:35', room: 'CS-102' },
    mFac2Algo_A && { mapping: mFac2Algo_A, day: 'Wednesday', period: 2, start: '09:50', end: '10:40', room: 'LH-201' },

    // Thursday
    mFac1DBMS_A && { mapping: mFac1DBMS_A, day: 'Thursday', period: 2, start: '09:50', end: '10:40', room: 'Lab-1' },

    // Friday
    mFac1WT_A && { mapping: mFac1WT_A, day: 'Friday', period: 1, start: '09:00', end: '09:50', room: 'CS-101' },
    mFac1DBMS_A && { mapping: mFac1DBMS_A, day: 'Friday', period: 3, start: '10:55', end: '11:45', room: 'Lab-1' },

    // Saturday
    mFac1WT_B && { mapping: mFac1WT_B, day: 'Saturday', period: 2, start: '09:50', end: '10:40', room: 'CS-102' },
  ].filter(Boolean);

  let ttCount = 0;
  for (const def of timetableDefs) {
    const existing = await TimetableEntry.findOne({
      academicYearId: def.mapping.academicYearId,
      classId: def.mapping.classId,
      sectionId: def.mapping.sectionId,
      dayOfWeek: def.day,
      period: def.period,
    });

    if (!existing) {
      await TimetableEntry.create({
        academicYearId: def.mapping.academicYearId,
        departmentId: def.mapping.departmentId,
        classId: def.mapping.classId,
        sectionId: def.mapping.sectionId,
        subjectId: def.mapping.subjectId,
        facultyId: def.mapping.facultyId,
        facultyMappingId: def.mapping._id,
        dayOfWeek: def.day,
        period: def.period,
        startTime: def.start,
        endTime: def.end,
        room: def.room,
        createdBy: adminId,
        isActive: true,
      });
      ttCount++;
    }
  }

  if (!silent && ttCount > 0) {
    console.log(`[Seed] Seeded ${ttCount} Timetable entries successfully`);
  }
};

/**
 * Seed Historical Attendance Sessions & Trigger In-App Notifications (Phase 5)
 */
const seedAttendanceSessionsAndNotifications = async (silent = false) => {
  const existingCount = await AttendanceSession.countDocuments();
  if (existingCount > 0) {
    if (!silent) console.log(`[Seed] Attendance sessions already exist (${existingCount} found) - Skipped`);
    return;
  }

  const adminUser = await User.findOne({ role: ROLES.ADMIN });
  const adminId = adminUser ? adminUser._id : null;
  const facultyUser = await User.findOne({ email: 'faculty@attendance.local' });
  const faculty = await Faculty.findOne({ email: 'faculty@attendance.local' });
  if (!faculty) return;

  const itDept = await Department.findOne({ code: 'IT' });
  if (!itDept) return;
  const itClass = await Class.findOne({ departmentId: itDept._id, year: 3, semester: 5 });
  if (!itClass) return;
  const itSecA = await Section.findOne({ classId: itClass._id, name: 'A' });
  const ay = await AcademicYear.findOne({ name: '2026-27' });
  const subDBMS = await Subject.findOne({ subjectCode: 'IT3501' });
  const subWT = await Subject.findOne({ subjectCode: 'IT3504' });

  if (!itSecA || !subDBMS || !subWT) return;

  const mappingDBMS = await FacultySubjectMapping.findOne({
    facultyId: faculty._id,
    subjectId: subDBMS._id,
    classId: itClass._id,
    sectionId: itSecA._id,
  });

  const mappingWT = await FacultySubjectMapping.findOne({
    facultyId: faculty._id,
    subjectId: subWT._id,
    classId: itClass._id,
    sectionId: itSecA._id,
  });

  if (!mappingDBMS || !mappingWT) return;

  // Students in III IT - A: 23IT001 to 23IT007
  const students = await Student.find({ classId: itClass._id, sectionId: itSecA._id }).sort({ registerNumber: 1 });
  if (students.length === 0) return;

  const now = new Date();

  const sessionConfigs = [
    // 10 sessions for DBMS
    { subject: subDBMS, mapping: mappingDBMS, dayOffset: 14, period: 1 },
    { subject: subDBMS, mapping: mappingDBMS, dayOffset: 12, period: 2 },
    { subject: subDBMS, mapping: mappingDBMS, dayOffset: 10, period: 1 },
    { subject: subDBMS, mapping: mappingDBMS, dayOffset: 8, period: 2 },
    { subject: subDBMS, mapping: mappingDBMS, dayOffset: 7, period: 1 },
    { subject: subDBMS, mapping: mappingDBMS, dayOffset: 5, period: 2 },
    { subject: subDBMS, mapping: mappingDBMS, dayOffset: 4, period: 1 },
    { subject: subDBMS, mapping: mappingDBMS, dayOffset: 3, period: 2 },
    { subject: subDBMS, mapping: mappingDBMS, dayOffset: 2, period: 1 },
    { subject: subDBMS, mapping: mappingDBMS, dayOffset: 1, period: 2 },

    // 10 sessions for Web Tech
    { subject: subWT, mapping: mappingWT, dayOffset: 13, period: 3 },
    { subject: subWT, mapping: mappingWT, dayOffset: 11, period: 4 },
    { subject: subWT, mapping: mappingWT, dayOffset: 9, period: 3 },
    { subject: subWT, mapping: mappingWT, dayOffset: 8, period: 4 },
    { subject: subWT, mapping: mappingWT, dayOffset: 6, period: 3 },
    { subject: subWT, mapping: mappingWT, dayOffset: 5, period: 4 },
    { subject: subWT, mapping: mappingWT, dayOffset: 4, period: 3 },
    { subject: subWT, mapping: mappingWT, dayOffset: 3, period: 4 },
    { subject: subWT, mapping: mappingWT, dayOffset: 2, period: 3 },
    { subject: subWT, mapping: mappingWT, dayOffset: 1, period: 4 },
  ];

  let sessionsCreated = 0;

  for (let idx = 0; idx < sessionConfigs.length; idx++) {
    const sc = sessionConfigs[idx];
    const sessionDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - sc.dayOffset, 0, 0, 0, 0));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[sessionDate.getUTCDay()];

    const session = await AttendanceSession.create({
      academicYearId: ay ? ay._id : null,
      departmentId: itDept._id,
      classId: itClass._id,
      sectionId: itSecA._id,
      subjectId: sc.subject._id,
      facultyId: faculty._id,
      facultyMappingId: sc.mapping?._id,
      attendanceDate: sessionDate,
      dayOfWeek,
      period: sc.period,
      sessionStatus: SESSION_STATUS.SUBMITTED,
      remarks: `Regular scheduled lecture ${idx + 1}`,
      markedBy: facultyUser?._id || adminId,
      markedAt: sessionDate,
      isActive: true,
    });

    const records = [];
    for (const st of students) {
      let status = ATTENDANCE_STATUS.PRESENT;
      let remarks = '';

      if (st.registerNumber === '23IT001') {
        // Demo Student (student@attendance.local)
        // In DBMS: absent on sessions 1, 3, 5, 7 -> 6/10 = 60% (CRITICAL/WARNING shortage)
        // In WT: absent on session 2, OD on session 4 -> 9/10 = 90% (SAFE)
        if (sc.subject.subjectCode === 'IT3501') {
          if ([1, 3, 5, 7].includes(idx % 10)) {
            status = ATTENDANCE_STATUS.ABSENT;
          }
        } else {
          if (idx % 10 === 2) status = ATTENDANCE_STATUS.ABSENT;
          if (idx % 10 === 4) status = ATTENDANCE_STATUS.ON_DUTY;
        }
      } else if (st.registerNumber === '23IT002') {
        status = ATTENDANCE_STATUS.PRESENT; // 100%
      } else if (st.registerNumber === '23IT003') {
        if (idx % 5 === 0) status = ATTENDANCE_STATUS.ON_DUTY;
        else status = ATTENDANCE_STATUS.PRESENT; // ~100%
      } else if (st.registerNumber === '23IT004') {
        if (idx % 5 === 1) status = ATTENDANCE_STATUS.ABSENT; // ~80%
      } else if (st.registerNumber === '23IT005') {
        if ([0, 3, 6].includes(idx % 10)) status = ATTENDANCE_STATUS.ABSENT; // ~70% Warning
      } else if (st.registerNumber === '23IT006') {
        if ([0, 2, 4, 6, 8].includes(idx % 10)) status = ATTENDANCE_STATUS.ABSENT; // ~40% Critical
        else if (idx % 10 === 1) status = ATTENDANCE_STATUS.MEDICAL_LEAVE;
      } else if (st.registerNumber === '23IT007') {
        if (idx % 7 === 0) status = ATTENDANCE_STATUS.ABSENT; // ~85% Safe
      }

      records.push({
        sessionId: session._id,
        studentId: st._id,
        status,
        remarks,
        markedBy: facultyUser?._id || adminId,
        markedAt: sessionDate,
      });
    }

    await AttendanceRecord.insertMany(records);
    sessionsCreated++;

    // Evaluate in-app notification engine
    await notificationService.processSessionNotifications(session._id);
  }

  if (!silent) {
    console.log(`[Seed] Seeded ${sessionsCreated} Attendance Sessions with records & notifications`);
  }
};

/**
 * Main execution if called directly from CLI
 */
const run = async () => {
  try {
    console.log('====================================================');
    console.log('🌱 Starting Database Seeding (Phase 2, 3, 4 & 5 Data)');
    console.log('====================================================');

    await connectDB();
    await seedUsers(false);
    await seedAcademicMasterData(false);
    await seedFacultyMappingsAndTimetable(false);
    await seedAttendanceSessionsAndNotifications(false);

    console.log('----------------------------------------------------');
    console.log('✅ Seeding completed successfully!');
    console.log('====================================================');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    try {
      await disconnectDB();
    } catch (_) {}
    process.exit(1);
  }
};

if (require.main === module) {
  run();
}

module.exports = {
  seedUsers,
  seedAcademicMasterData,
  seedFacultyMappingsAndTimetable,
  seedAttendanceSessionsAndNotifications,
  SEED_USERS,
};
