const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const FacultySubjectMapping = require('../models/FacultySubjectMapping');
const Faculty = require('../models/Faculty');
const AppError = require('../utils/appError');
const {
  ATTENDANCE_STATUS,
  ATTENDANCE_TIERS,
  DEFAULT_THRESHOLDS,
} = require('../config/constants');

class AttendanceCalculationService {
  /**
   * Determine attendance tier based on percentage
   */
  classifyStatus(percentage) {
    if (percentage >= 90) return ATTENDANCE_TIERS.EXCELLENT;
    if (percentage >= 80) return ATTENDANCE_TIERS.SAFE;
    if (percentage >= 75) return ATTENDANCE_TIERS.CAUTION;
    if (percentage >= 65) return ATTENDANCE_TIERS.WARNING;
    return ATTENDANCE_TIERS.CRITICAL;
  }

  /**
   * Calculate recovery classes needed to reach target (default: 75%)
   * Formula: x >= ((target * conducted) - attended) / (1 - target)
   */
  calculateRecoveryNeeded(attended, conducted, target = 0.75) {
    if (conducted === 0) return 0;
    const currentPercent = (attended / conducted) * 100;
    if (currentPercent >= target * 100) return 0;

    const numerator = target * conducted - attended;
    const denominator = 1 - target;
    const x = Math.ceil(numerator / denominator);
    return Math.max(1, x);
  }

  /**
   * Calculate safe bunk buffer (classes a student can miss while remaining >= target)
   */
  calculateBunkBuffer(attended, conducted, target = 0.75) {
    if (conducted === 0) return 0;
    const currentPercent = (attended / conducted) * 100;
    if (currentPercent < target * 100) return 0;

    const buffer = Math.floor((attended - target * conducted) / target);
    return Math.max(0, buffer);
  }

  /**
   * 1. Calculate overall & subject-wise attendance for a student
   */
  async getStudentSummary(studentId) {
    const student = await Student.findById(studentId)
      .populate('classId', 'name year semester programme')
      .populate('sectionId', 'name displayName')
      .populate('departmentId', 'name code')
      .populate('academicYearId', 'name');

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    // Find all attendance records for this student
    const records = await AttendanceRecord.find({ studentId })
      .populate({
        path: 'sessionId',
        select: 'subjectId classId sectionId attendanceDate period isActive sessionStatus facultyId',
        populate: [
          { path: 'subjectId', select: 'subjectCode subjectName credits subjectType semester' },
          { path: 'facultyId', select: 'name employeeId' },
        ],
      });

    // Filter to active, non-cancelled sessions
    const validRecords = records.filter(
      (r) => r.sessionId && r.sessionId.isActive && r.sessionId.sessionStatus !== 'CANCELLED'
    );

    // Also find all curriculum subjects mapped to student's class/section
    const mappings = await FacultySubjectMapping.find({
      classId: student.classId._id,
      sectionId: student.sectionId._id,
      isActive: true,
    })
      .populate('subjectId', 'subjectCode subjectName credits subjectType semester')
      .populate('facultyId', 'name employeeId');

    // Group records by subject
    const subjectMap = new Map();

    // Initialize with all mapped subjects (even if 0 classes conducted yet)
    mappings.forEach((m) => {
      if (!m.subjectId) return;
      const subId = m.subjectId._id.toString();
      if (!subjectMap.has(subId)) {
        subjectMap.set(subId, {
          subjectId: m.subjectId._id,
          subjectCode: m.subjectId.subjectCode,
          subjectName: m.subjectId.subjectName,
          credits: m.subjectId.credits,
          subjectType: m.subjectId.subjectType,
          semester: m.subjectId.semester,
          facultyName: m.facultyId?.name || 'Assigned Instructor',
          facultyEmployeeId: m.facultyId?.employeeId || '—',
          conducted: 0,
          attended: 0,
          absent: 0,
          onDuty: 0,
          medicalLeave: 0,
        });
      }
    });

    // Populate with actual record counts
    validRecords.forEach((r) => {
      const sub = r.sessionId?.subjectId;
      if (!sub) return;
      const subId = sub._id.toString();

      if (!subjectMap.has(subId)) {
        subjectMap.set(subId, {
          subjectId: sub._id,
          subjectCode: sub.subjectCode,
          subjectName: sub.subjectName,
          credits: sub.credits,
          subjectType: sub.subjectType,
          semester: sub.semester,
          facultyName: r.sessionId.facultyId?.name || 'Instructor',
          facultyEmployeeId: r.sessionId.facultyId?.employeeId || '—',
          conducted: 0,
          attended: 0,
          absent: 0,
          onDuty: 0,
          medicalLeave: 0,
        });
      }

      const item = subjectMap.get(subId);
      item.conducted += 1;

      if (r.status === ATTENDANCE_STATUS.PRESENT) {
        item.attended += 1;
      } else if (r.status === ATTENDANCE_STATUS.ON_DUTY) {
        item.attended += 1;
        item.onDuty += 1;
      } else if (r.status === ATTENDANCE_STATUS.ABSENT) {
        item.absent += 1;
      } else if (r.status === ATTENDANCE_STATUS.MEDICAL_LEAVE) {
        item.medicalLeave += 1;
      }
    });

    // Compute metrics for each subject
    let totalConducted = 0;
    let totalAttended = 0;
    let shortageSubjectsCount = 0;
    let safeSubjectsCount = 0;

    const subjectsList = Array.from(subjectMap.values()).map((s) => {
      totalConducted += s.conducted;
      totalAttended += s.attended;

      const percentage =
        s.conducted === 0 ? 100 : Math.round((s.attended / s.conducted) * 10000) / 100;
      const status = this.classifyStatus(percentage);
      const classesToRecover = this.calculateRecoveryNeeded(s.attended, s.conducted, 0.75);
      const bunkBuffer = this.calculateBunkBuffer(s.attended, s.conducted, 0.75);
      const isShortage = percentage < 75;

      if (isShortage) {
        shortageSubjectsCount += 1;
      } else {
        safeSubjectsCount += 1;
      }

      return {
        ...s,
        percentage,
        status,
        classesToRecover,
        bunkBuffer,
        isShortage,
      };
    });

    const overallPercentage =
      totalConducted === 0 ? 100 : Math.round((totalAttended / totalConducted) * 10000) / 100;
    const overallStatus = this.classifyStatus(overallPercentage);
    const overallRecoveryNeeded = this.calculateRecoveryNeeded(totalAttended, totalConducted, 0.75);
    const overallBunkBuffer = this.calculateBunkBuffer(totalAttended, totalConducted, 0.75);

    return {
      student: {
        id: student._id,
        name: student.name,
        registerNumber: student.registerNumber,
        email: student.email,
        phone: student.phone,
        department: student.departmentId?.name,
        departmentCode: student.departmentId?.code,
        class: student.classId?.name,
        section: student.sectionId?.displayName || `Sec ${student.sectionId?.name}`,
        year: student.classId?.year,
        semester: student.classId?.semester,
        academicYear: student.academicYearId?.name,
      },
      overall: {
        totalConducted,
        totalAttended,
        overallPercentage,
        status: overallStatus,
        classesToRecover: overallRecoveryNeeded,
        bunkBuffer: overallBunkBuffer,
        isShortage: overallPercentage < 75,
        totalSubjects: subjectsList.length,
        safeSubjectsCount,
        shortageSubjectsCount,
      },
      subjects: subjectsList,
    };
  }

  /**
   * 2. Chronological attendance history for a student
   */
  async getStudentHistory(studentId, queryParams = {}) {
    const { page = 1, limit = 50, subjectId, status } = queryParams;

    const filter = { studentId };
    if (status) filter.status = status;

    const records = await AttendanceRecord.find(filter)
      .populate({
        path: 'sessionId',
        select: 'subjectId attendanceDate period facultyId isActive sessionStatus',
        populate: [
          { path: 'subjectId', select: 'subjectCode subjectName' },
          { path: 'facultyId', select: 'name' },
        ],
      })
      .sort({ createdAt: -1 });

    const validRecords = records.filter(
      (r) =>
        r.sessionId &&
        r.sessionId.isActive &&
        r.sessionId.sessionStatus !== 'CANCELLED' &&
        (!subjectId || r.sessionId.subjectId?._id?.toString() === subjectId)
    );

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (parsedPage - 1) * parsedLimit;
    const paginatedItems = validRecords.slice(skip, skip + parsedLimit);

    return {
      items: paginatedItems.map((r) => ({
        id: r._id,
        date: r.sessionId.attendanceDate,
        period: r.sessionId.period,
        subjectCode: r.sessionId.subjectId?.subjectCode,
        subjectName: r.sessionId.subjectId?.subjectName,
        facultyName: r.sessionId.facultyId?.name,
        status: r.status,
        remarks: r.remarks,
        markedAt: r.markedAt,
      })),
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalItems: validRecords.length,
        totalPages: Math.ceil(validRecords.length / parsedLimit) || 1,
      },
    };
  }

  /**
   * 3. College-wide / Departmental Shortage List
   * Identifies all students with attendance < 75% in any subject or overall
   */
  async getShortageList(queryParams = {}) {
    const { departmentId, classId, sectionId, subjectId, statusTier } = queryParams;

    // Filter students
    const studentFilter = { isActive: true };
    if (departmentId) studentFilter.departmentId = departmentId;
    if (classId) studentFilter.classId = classId;
    if (sectionId) studentFilter.sectionId = sectionId;

    const students = await Student.find(studentFilter)
      .populate('classId', 'name year semester')
      .populate('sectionId', 'name displayName')
      .populate('departmentId', 'name code')
      .select('registerNumber name email departmentId classId sectionId');

    const shortageEntries = [];

    for (const student of students) {
      const summary = await this.getStudentSummary(student._id);

      for (const sub of summary.subjects) {
        if (subjectId && sub.subjectId.toString() !== subjectId) continue;

        if (sub.isShortage) {
          if (statusTier && sub.status !== statusTier) continue;

          shortageEntries.push({
            studentId: student._id,
            registerNumber: student.registerNumber,
            name: student.name,
            department: student.departmentId?.name,
            departmentCode: student.departmentId?.code,
            className: student.classId?.name,
            sectionName: student.sectionId?.displayName || `Sec ${student.sectionId?.name}`,
            subjectId: sub.subjectId,
            subjectCode: sub.subjectCode,
            subjectName: sub.subjectName,
            facultyName: sub.facultyName,
            conducted: sub.conducted,
            attended: sub.attended,
            percentage: sub.percentage,
            status: sub.status,
            classesToRecover: sub.classesToRecover,
          });
        }
      }
    }

    return shortageEntries;
  }

  /**
   * 4. Admin Overview & Dashboard Metrics
   */
  async getAdminOverview() {
    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));

    const [todaySessionsCount, allStudents] = await Promise.all([
      AttendanceSession.countDocuments({
        attendanceDate: startOfToday,
        isActive: true,
      }),
      Student.find({ isActive: true }).select('_id'),
    ]);

    let below75Count = 0;
    let criticalCount = 0;
    let totalPercentagesSum = 0;
    let evaluatedStudentsCount = 0;

    for (const s of allStudents) {
      const summary = await this.getStudentSummary(s._id);
      if (summary.overall.totalConducted > 0) {
        evaluatedStudentsCount += 1;
        totalPercentagesSum += summary.overall.overallPercentage;

        if (summary.overall.isShortage) {
          below75Count += 1;
        }
        if (summary.overall.status === ATTENDANCE_TIERS.CRITICAL) {
          criticalCount += 1;
        }
      }
    }

    const averageAttendance =
      evaluatedStudentsCount === 0
        ? 100
        : Math.round((totalPercentagesSum / evaluatedStudentsCount) * 10) / 10;

    return {
      todaySessionsCount,
      below75Count,
      criticalCount,
      averageAttendance,
      evaluatedStudentsCount,
      totalStudentsCount: allStudents.length,
    };
  }

  /**
   * 5. Faculty Shortage Roster
   */
  async getFacultyShortageStudents(userId) {
    const faculty = await Faculty.findOne({ userId });
    if (!faculty) {
      throw new AppError('No faculty profile linked to current account', 404);
    }

    // Find all mappings for this faculty
    const mappings = await FacultySubjectMapping.find({
      facultyId: faculty._id,
      isActive: true,
    });

    const shortageEntries = [];

    for (const m of mappings) {
      const students = await Student.find({
        classId: m.classId,
        sectionId: m.sectionId,
        isActive: true,
      }).populate('classId', 'name').populate('sectionId', 'displayName name');

      const subject = await Subject.findById(m.subjectId);

      for (const st of students) {
        const summary = await this.getStudentSummary(st._id);
        const subData = summary.subjects.find(
          (s) => s.subjectId.toString() === m.subjectId.toString()
        );

        if (subData && subData.isShortage) {
          shortageEntries.push({
            studentId: st._id,
            registerNumber: st.registerNumber,
            name: st.name,
            className: st.classId?.name,
            sectionName: st.sectionId?.displayName || `Sec ${st.sectionId?.name}`,
            subjectCode: subject?.subjectCode,
            subjectName: subject?.subjectName,
            conducted: subData.conducted,
            attended: subData.attended,
            percentage: subData.percentage,
            status: subData.status,
            classesToRecover: subData.classesToRecover,
          });
        }
      }
    }

    return shortageEntries;
  }
}

module.exports = new AttendanceCalculationService();
