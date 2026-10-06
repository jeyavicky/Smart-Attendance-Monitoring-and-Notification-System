const mongoose = require('mongoose');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const FacultySubjectMapping = require('../models/FacultySubjectMapping');
const TimetableEntry = require('../models/TimetableEntry');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');
const notificationService = require('./notificationService');
const AppError = require('../utils/appError');
const { ROLES, ATTENDANCE_STATUS, SESSION_STATUS } = require('../config/constants');

class AttendanceService {
  /**
   * Helper: Normalize date to midnight UTC/day boundary
   */
  normalizeDate(dateInput) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      throw new AppError('Invalid attendance date format', 400);
    }
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  }

  /**
   * Helper: Derive day of week string from date
   */
  getDayOfWeek(dateObj) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[dateObj.getUTCDay()];
  }

  /**
   * 1. Load active student roster for attendance marking
   * Security: Resolves class and section strictly from authorized mapping/timetable
   */
  async getStudentsForMarking({ mappingId, timetableId }, user) {
    let mapping = null;
    let timetableEntry = null;

    if (timetableId) {
      timetableEntry = await TimetableEntry.findById(timetableId)
        .populate('facultyMappingId')
        .populate('classId', 'name year semester')
        .populate('sectionId', 'name displayName capacity')
        .populate('subjectId', 'subjectCode subjectName credits')
        .populate('facultyId', 'name employeeId')
        .populate('departmentId', 'name code')
        .populate('academicYearId', 'name');

      if (!timetableEntry) {
        throw new AppError('Timetable entry not found', 404);
      }
      mapping = timetableEntry.facultyMappingId;
    } else if (mappingId) {
      mapping = await FacultySubjectMapping.findById(mappingId)
        .populate('classId', 'name year semester')
        .populate('sectionId', 'name displayName capacity')
        .populate('subjectId', 'subjectCode subjectName credits')
        .populate('facultyId', 'name employeeId')
        .populate('departmentId', 'name code')
        .populate('academicYearId', 'name');

      if (!mapping) {
        throw new AppError('Faculty subject mapping not found', 404);
      }
    } else {
      throw new AppError('Either mappingId or timetableId must be provided', 400);
    }

    if (!mapping.isActive) {
      throw new AppError('Cannot mark attendance for an inactive faculty mapping', 400);
    }

    // Role verification: Faculty can ONLY access their own mapped classes
    if (user.role === ROLES.FACULTY) {
      const faculty = await Faculty.findOne({ userId: user._id });
      if (!faculty) {
        throw new AppError('No faculty profile linked to current account', 404);
      }
      const mappingFacultyId = mapping.facultyId?._id
        ? mapping.facultyId._id.toString()
        : mapping.facultyId.toString();

      if (mappingFacultyId !== faculty._id.toString()) {
        throw new AppError('You are not authorized to mark attendance for this faculty mapping', 403);
      }
    }

    const classId = mapping.classId?._id || mapping.classId;
    const sectionId = mapping.sectionId?._id || mapping.sectionId;

    // Load active students belonging to exact class and section
    const students = await Student.find({
      classId,
      sectionId,
      isActive: true,
    })
      .select('registerNumber name gender phone email')
      .sort({ registerNumber: 1 });

    return {
      mappingId: mapping._id,
      timetableId: timetableEntry ? timetableEntry._id : null,
      classInfo: {
        id: mapping.classId?._id || mapping.classId,
        name: mapping.classId?.name,
        year: mapping.classId?.year,
        semester: mapping.classId?.semester,
      },
      sectionInfo: {
        id: mapping.sectionId?._id || mapping.sectionId,
        name: mapping.sectionId?.name,
        displayName: mapping.sectionId?.displayName || `Sec ${mapping.sectionId?.name}`,
        capacity: mapping.sectionId?.capacity,
      },
      subjectInfo: {
        id: mapping.subjectId?._id || mapping.subjectId,
        subjectCode: mapping.subjectId?.subjectCode,
        subjectName: mapping.subjectId?.subjectName,
        credits: mapping.subjectId?.credits,
      },
      facultyInfo: {
        id: mapping.facultyId?._id || mapping.facultyId,
        name: mapping.facultyId?.name,
        employeeId: mapping.facultyId?.employeeId,
      },
      period: timetableEntry ? timetableEntry.period : null,
      room: timetableEntry ? timetableEntry.room : null,
      studentsCount: students.length,
      students: students.map((s) => ({
        id: s._id,
        registerNumber: s.registerNumber,
        name: s.name,
        gender: s.gender,
      })),
    };
  }

  /**
   * 2. Create Attendance Session and Records (Atomic)
   */
  async createSession(data, user) {
    const {
      facultyMappingId,
      mappingId,
      timetableEntryId,
      timetableId,
      attendanceDate,
      period,
      records = [],
      remarks = '',
    } = data;

    const resolvedMappingRef = facultyMappingId || mappingId;
    const resolvedTimetableRef = timetableEntryId || timetableId;

    if (!records || !Array.isArray(records) || records.length === 0) {
      throw new AppError('Student attendance records are required', 400);
    }

    // Resolve mapping & timetable
    let mapping = null;
    let timetableEntry = null;

    if (resolvedTimetableRef) {
      timetableEntry = await TimetableEntry.findById(resolvedTimetableRef).populate('facultyMappingId');
      if (!timetableEntry) {
        throw new AppError('Specified timetable entry not found', 404);
      }
      mapping = timetableEntry.facultyMappingId;
    } else if (resolvedMappingRef) {
      mapping = await FacultySubjectMapping.findById(resolvedMappingRef);
      if (!mapping) {
        throw new AppError('Specified faculty mapping not found', 404);
      }
    } else {
      throw new AppError('Either facultyMappingId or timetableEntryId is required', 400);
    }

    if (!mapping.isActive) {
      throw new AppError('Cannot mark attendance for an inactive faculty mapping', 400);
    }

    // Faculty Authorization Check
    let resolvedFacultyId = mapping.facultyId;
    if (user.role === ROLES.FACULTY) {
      const faculty = await Faculty.findOne({ userId: user._id });
      if (!faculty) {
        throw new AppError('No faculty profile linked to current account', 404);
      }
      if (mapping.facultyId.toString() !== faculty._id.toString()) {
        throw new AppError('You are not authorized to mark attendance for another faculty member', 403);
      }
      resolvedFacultyId = faculty._id;
    } else if (user.role === ROLES.STUDENT) {
      throw new AppError('Students are not permitted to record attendance sessions', 403);
    }

    // Date & Period Validation
    const normalizedDate = this.normalizeDate(attendanceDate);
    const dayOfWeek = this.getDayOfWeek(normalizedDate);
    const parsedPeriod = parseInt(period, 10);

    if (isNaN(parsedPeriod) || parsedPeriod < 1 || parsedPeriod > 10) {
      throw new AppError('Period must be an integer between 1 and 10', 400);
    }

    // Session Uniqueness Check
    const existingSession = await AttendanceSession.findOne({
      classId: mapping.classId,
      sectionId: mapping.sectionId,
      subjectId: mapping.subjectId,
      attendanceDate: normalizedDate,
      period: parsedPeriod,
      isActive: true,
    });

    if (existingSession) {
      throw new AppError(
        'Attendance has already been recorded for this class, subject, date, and period.',
        409
      );
    }

    // Student Roster Validation
    const studentIdSet = new Set();
    for (const r of records) {
      if (!r.studentId) {
        throw new AppError('Every record must specify a studentId', 400);
      }
      if (studentIdSet.has(r.studentId.toString())) {
        throw new AppError(`Duplicate student record found in submission: ${r.studentId}`, 400);
      }
      studentIdSet.add(r.studentId.toString());

      if (!Object.values(ATTENDANCE_STATUS).includes(r.status)) {
        throw new AppError(
          `Invalid status '${r.status}'. Allowed values: ${Object.values(ATTENDANCE_STATUS).join(', ')}`,
          400
        );
      }
    }

    const studentIds = Array.from(studentIdSet);
    const dbStudents = await Student.find({ _id: { $in: studentIds } });

    if (dbStudents.length !== studentIds.length) {
      throw new AppError('One or more student identifiers are invalid or not found', 400);
    }

    for (const s of dbStudents) {
      if (!s.isActive) {
        throw new AppError(`Student ${s.registerNumber} (${s.name}) is inactive and cannot be marked`, 400);
      }
      if (
        s.classId.toString() !== mapping.classId.toString() ||
        s.sectionId.toString() !== mapping.sectionId.toString()
      ) {
        throw new AppError(
          `Student ${s.registerNumber} does not belong to the selected class cohort and section`,
          400
        );
      }
    }

    // Atomic Insertion with Safe Rollback
    let createdSessionDoc = null;
    let createdRecordDocs = [];

    // Check if MongoDB supports replica set transactions
    let useTransaction = false;
    let mongoSession = null;
    const topologyType = mongoose.connection?.client?.topology?.description?.type || '';
    const isReplicaSet = topologyType.includes('ReplicaSet');

    if (isReplicaSet) {
      try {
        mongoSession = await mongoose.startSession();
        mongoSession.startTransaction();
        useTransaction = true;
      } catch (_) {
        useTransaction = false;
        if (mongoSession) {
          try {
            await mongoSession.endSession();
          } catch (e) {}
          mongoSession = null;
        }
      }
    }

    try {
      const sessionOptions = useTransaction ? { session: mongoSession } : {};

      const [newSession] = await AttendanceSession.create(
        [
          {
            academicYearId: mapping.academicYearId,
            departmentId: mapping.departmentId,
            classId: mapping.classId,
            sectionId: mapping.sectionId,
            subjectId: mapping.subjectId,
            facultyId: resolvedFacultyId,
            facultyMappingId: mapping._id,
            timetableEntryId: timetableEntry ? timetableEntry._id : null,
            attendanceDate: normalizedDate,
            dayOfWeek,
            period: parsedPeriod,
            sessionStatus: SESSION_STATUS.SUBMITTED,
            remarks: remarks ? remarks.trim() : '',
            markedBy: user._id,
            markedAt: new Date(),
            isActive: true,
          },
        ],
        sessionOptions
      );

      createdSessionDoc = newSession;

      const recordDocs = records.map((r) => ({
        sessionId: newSession._id,
        studentId: r.studentId,
        status: r.status,
        remarks: r.remarks ? r.remarks.trim() : '',
        markedBy: user._id,
        markedAt: new Date(),
      }));

      createdRecordDocs = await AttendanceRecord.insertMany(recordDocs, sessionOptions);

      if (useTransaction && mongoSession) {
        await mongoSession.commitTransaction();
      }
    } catch (err) {
      if (useTransaction && mongoSession) {
        await mongoSession.abortTransaction();
      } else {
        // Safe manual rollback for non-transaction environment
        if (createdSessionDoc && createdSessionDoc._id) {
          try {
            await AttendanceRecord.deleteMany({ sessionId: createdSessionDoc._id });
            await AttendanceSession.deleteOne({ _id: createdSessionDoc._id });
          } catch (cleanupErr) {
            console.error('Failed to rollback partial attendance records:', cleanupErr);
          }
        }
      }
      throw err;
    } finally {
      if (mongoSession) {
        try {
          await mongoSession.endSession();
        } catch (e) {}
      }
    }

    // Audit Logging
    try {
      await AuditLog.create({
        action: 'ATTENDANCE_CREATED',
        performedBy: user._id,
        role: user.role,
        resource: 'AttendanceSession',
        resourceId: createdSessionDoc._id,
        metadata: {
          classId: mapping.classId,
          sectionId: mapping.sectionId,
          subjectId: mapping.subjectId,
          attendanceDate: normalizedDate,
          period: parsedPeriod,
          totalRecords: createdRecordDocs.length,
        },
      });
    } catch (auditErr) {
      console.warn('Audit logging error:', auditErr.message);
    }

    // Process automated notifications for students affected by this session
    try {
      await notificationService.processSessionNotifications(createdSessionDoc._id);
    } catch (notifErr) {
      console.warn('Notification processing error:', notifErr.message);
    }

    return this.getSessionById(createdSessionDoc._id, user);
  }

  /**
   * 3. Retrieve Attendance Sessions List with Counts & Filters
   */
  async getSessions(queryParams = {}, user) {
    const {
      page = 1,
      limit = 20,
      classId,
      sectionId,
      subjectId,
      facultyId,
      departmentId,
      date,
      startDate,
      endDate,
      status,
      period,
      sortBy = 'attendanceDate',
      sortOrder = 'desc',
    } = queryParams;

    const filter = { isActive: true };

    // RBAC Data Isolation: Faculty can ONLY query their own attendance sessions
    if (user.role === ROLES.FACULTY) {
      const faculty = await Faculty.findOne({ userId: user._id });
      if (!faculty) {
        throw new AppError('No faculty profile linked to current account', 404);
      }
      filter.facultyId = faculty._id;
    } else if (user.role === ROLES.STUDENT) {
      throw new AppError('Students are not authorized to view the full attendance session directory', 403);
    } else if (facultyId) {
      // Admin filter
      filter.facultyId = facultyId;
    }

    if (departmentId) filter.departmentId = departmentId;
    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;
    if (subjectId) filter.subjectId = subjectId;
    if (period) filter.period = parseInt(period, 10);
    if (status) filter.sessionStatus = status;

    // Date filters
    if (date) {
      const targetDate = this.normalizeDate(date);
      filter.attendanceDate = targetDate;
    } else if (startDate || endDate) {
      filter.attendanceDate = {};
      if (startDate) filter.attendanceDate.$gte = this.normalizeDate(startDate);
      if (endDate) filter.attendanceDate.$lte = this.normalizeDate(endDate);
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const sortOptions = {};
    if (sortBy === 'attendanceDate' || sortBy === 'createdAt' || sortBy === 'period') {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.attendanceDate = -1;
      sortOptions.period = -1;
    }

    const [items, totalItems] = await Promise.all([
      AttendanceSession.find(filter)
        .populate('facultyId', 'name employeeId')
        .populate('subjectId', 'subjectCode subjectName credits')
        .populate('classId', 'name year semester')
        .populate('sectionId', 'name displayName')
        .populate('departmentId', 'name code')
        .populate('markedBy', 'name email')
        .populate('lastUpdatedBy', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(parsedLimit),
      AttendanceSession.countDocuments(filter),
    ]);

    // Aggregate attendance counts for the fetched sessions
    const sessionIds = items.map((s) => s._id);
    const countAggregates = await AttendanceRecord.aggregate([
      { $match: { sessionId: { $in: sessionIds } } },
      {
        $group: {
          _id: { sessionId: '$sessionId', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]);

    const sessionCountsMap = {};
    sessionIds.forEach((id) => {
      sessionCountsMap[id.toString()] = {
        P: 0,
        A: 0,
        OD: 0,
        ML: 0,
        total: 0,
      };
    });

    countAggregates.forEach((item) => {
      const sId = item._id.sessionId.toString();
      const statusKey = item._id.status;
      if (sessionCountsMap[sId]) {
        sessionCountsMap[sId][statusKey] = item.count;
        sessionCountsMap[sId].total += item.count;
      }
    });

    const enrichedItems = items.map((doc) => {
      const docObj = doc.toJSON();
      const counts = sessionCountsMap[doc._id.toString()] || { P: 0, A: 0, OD: 0, ML: 0, total: 0 };
      return {
        ...docObj,
        counts: {
          present: counts.P,
          absent: counts.A,
          onDuty: counts.OD,
          medicalLeave: counts.ML,
          total: counts.total,
        },
      };
    });

    const totalPages = Math.ceil(totalItems / parsedLimit) || 1;

    return {
      items: enrichedItems,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalItems,
        totalPages,
      },
    };
  }

  /**
   * 4. Retrieve Single Session Details with Full Student Records
   */
  async getSessionById(id, user) {
    const session = await AttendanceSession.findById(id)
      .populate('facultyId', 'name employeeId designation email')
      .populate('subjectId', 'subjectCode subjectName credits subjectType semester')
      .populate('classId', 'name year semester programme')
      .populate('sectionId', 'name displayName capacity')
      .populate('departmentId', 'name code')
      .populate('academicYearId', 'name')
      .populate('markedBy', 'name email role')
      .populate('lastUpdatedBy', 'name email role');

    if (!session) {
      throw new AppError('Attendance session not found', 404);
    }

    // Role check: Faculty can ONLY access their own session
    if (user.role === ROLES.FACULTY) {
      const faculty = await Faculty.findOne({ userId: user._id });
      if (!faculty) {
        throw new AppError('No faculty profile linked to current account', 404);
      }
      if (session.facultyId?._id.toString() !== faculty._id.toString()) {
        throw new AppError('You are not authorized to view another faculty member\'s attendance session', 403);
      }
    } else if (user.role === ROLES.STUDENT) {
      throw new AppError('Students are not authorized to access full session rosters', 403);
    }

    const records = await AttendanceRecord.find({ sessionId: id })
      .populate('studentId', 'registerNumber name gender email')
      .sort({ 'studentId.registerNumber': 1 });

    const counts = {
      present: records.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT).length,
      absent: records.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT).length,
      onDuty: records.filter((r) => r.status === ATTENDANCE_STATUS.ON_DUTY).length,
      medicalLeave: records.filter((r) => r.status === ATTENDANCE_STATUS.MEDICAL_LEAVE).length,
      total: records.length,
    };

    return {
      session,
      records: records.map((r) => ({
        id: r._id,
        studentId: r.studentId?._id,
        registerNumber: r.studentId?.registerNumber,
        name: r.studentId?.name,
        gender: r.studentId?.gender,
        status: r.status,
        remarks: r.remarks || '',
        markedAt: r.markedAt,
        lastUpdatedAt: r.lastUpdatedAt,
      })),
      counts,
    };
  }

  /**
   * 5. Edit Attendance Session Records
   */
  async updateSession(id, data, user) {
    const session = await AttendanceSession.findById(id);
    if (!session) {
      throw new AppError('Attendance session not found', 404);
    }

    if (!session.isActive) {
      throw new AppError('Cannot edit an inactive or cancelled attendance session', 400);
    }

    // Authorization: Faculty can ONLY edit their own session
    if (user.role === ROLES.FACULTY) {
      const faculty = await Faculty.findOne({ userId: user._id });
      if (!faculty) {
        throw new AppError('No faculty profile linked to current account', 404);
      }
      if (session.facultyId.toString() !== faculty._id.toString()) {
        throw new AppError('You are not authorized to edit another faculty member\'s attendance session', 403);
      }
    } else if (user.role === ROLES.STUDENT) {
      throw new AppError('Students are not permitted to modify attendance records', 403);
    }

    const { records = [], remarks } = data;

    if (records && Array.isArray(records) && records.length > 0) {
      for (const r of records) {
        if (!Object.values(ATTENDANCE_STATUS).includes(r.status)) {
          throw new AppError(`Invalid status '${r.status}'`, 400);
        }

        await AttendanceRecord.updateOne(
          { sessionId: id, studentId: r.studentId },
          {
            $set: {
              status: r.status,
              remarks: r.remarks !== undefined ? r.remarks : '',
              lastUpdatedBy: user._id,
              lastUpdatedAt: new Date(),
            },
          }
        );
      }
    }

    if (remarks !== undefined) {
      session.remarks = remarks.trim();
    }
    session.lastUpdatedBy = user._id;
    session.lastUpdatedAt = new Date();
    await session.save();

    // Audit Log
    try {
      await AuditLog.create({
        action: 'ATTENDANCE_UPDATED',
        performedBy: user._id,
        role: user.role,
        resource: 'AttendanceSession',
        resourceId: session._id,
        metadata: {
          updatedRecordsCount: records.length,
          lastUpdatedBy: user._id,
        },
      });
    } catch (auditErr) {
      console.warn('Audit logging error:', auditErr.message);
    }

    // Process automated notifications for students affected by this update
    try {
      await notificationService.processSessionNotifications(session._id);
    } catch (notifErr) {
      console.warn('Notification processing error on update:', notifErr.message);
    }

    return this.getSessionById(session._id, user);
  }

  /**
   * 6. Cancel or Deactivate Attendance Session
   */
  async cancelSession(id, user) {
    const session = await AttendanceSession.findById(id);
    if (!session) {
      throw new AppError('Attendance session not found', 404);
    }

    if (user.role === ROLES.FACULTY) {
      const faculty = await Faculty.findOne({ userId: user._id });
      if (!faculty || session.facultyId.toString() !== faculty._id.toString()) {
        throw new AppError('You are not authorized to cancel this attendance session', 403);
      }
    } else if (user.role === ROLES.STUDENT) {
      throw new AppError('Students are not permitted to cancel attendance sessions', 403);
    }

    session.sessionStatus = SESSION_STATUS.CANCELLED;
    session.isActive = false;
    session.lastUpdatedBy = user._id;
    session.lastUpdatedAt = new Date();
    await session.save();

    // Audit Log
    try {
      await AuditLog.create({
        action: 'ATTENDANCE_CANCELLED',
        performedBy: user._id,
        role: user.role,
        resource: 'AttendanceSession',
        resourceId: session._id,
      });
    } catch (e) {}

    return { id, message: 'Attendance session cancelled successfully' };
  }

  /**
   * 7. Faculty Today's Timetable with Attendance Marking Status
   */
  async getTodayTimetableWithAttendance(userId) {
    const faculty = await Faculty.findOne({ userId });
    if (!faculty) {
      throw new AppError('No faculty profile linked to current account', 404);
    }

    const todayDate = new Date();
    const normalizedToday = this.normalizeDate(todayDate);
    const dayOfWeek = this.getDayOfWeek(normalizedToday);

    const timetableEntries = await TimetableEntry.find({
      facultyId: faculty._id,
      dayOfWeek,
      isActive: true,
    })
      .populate('subjectId', 'subjectCode subjectName credits')
      .populate('classId', 'name year semester')
      .populate('sectionId', 'name displayName')
      .populate('facultyMappingId')
      .sort({ period: 1 });

    const sessionsToday = await AttendanceSession.find({
      facultyId: faculty._id,
      attendanceDate: normalizedToday,
      isActive: true,
    });

    const entriesWithStatus = timetableEntries.map((entry) => {
      const matchingSession = sessionsToday.find((s) => s.period === entry.period);
      return {
        id: entry._id,
        period: entry.period,
        startTime: entry.startTime,
        endTime: entry.endTime,
        room: entry.room || '—',
        dayOfWeek: entry.dayOfWeek,
        facultyMappingId: entry.facultyMappingId?._id || entry.facultyMappingId,
        subject: {
          id: entry.subjectId?._id,
          code: entry.subjectId?.subjectCode,
          name: entry.subjectId?.subjectName,
        },
        classCohort: {
          id: entry.classId?._id,
          name: entry.classId?.name,
        },
        section: {
          id: entry.sectionId?._id,
          name: entry.sectionId?.name,
          displayName: entry.sectionId?.displayName || `Sec ${entry.sectionId?.name}`,
        },
        isMarked: Boolean(matchingSession),
        attendanceStatus: matchingSession ? 'Completed' : 'Not Marked',
        sessionId: matchingSession ? matchingSession._id : null,
      };
    });

    return {
      currentDay: dayOfWeek,
      currentDate: normalizedToday.toISOString().split('T')[0],
      totalScheduled: entriesWithStatus.length,
      completedCount: entriesWithStatus.filter((e) => e.isMarked).length,
      pendingCount: entriesWithStatus.filter((e) => !e.isMarked).length,
      schedule: entriesWithStatus,
    };
  }
}

module.exports = new AttendanceService();
