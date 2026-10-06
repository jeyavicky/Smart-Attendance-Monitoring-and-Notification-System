const Student = require('../models/Student');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const AttendanceSession = require('../models/AttendanceSession');
const attendanceCalculationService = require('./attendanceCalculationService');
const AppError = require('../utils/appError');

class ReportService {
  /**
   * 1. Student Attendance Report
   */
  async getStudentReport(studentId) {
    const summary = await attendanceCalculationService.getStudentSummary(studentId);
    return {
      generatedAt: new Date(),
      type: 'STUDENT_REPORT',
      student: summary.student,
      overall: summary.overall,
      subjects: summary.subjects,
    };
  }

  /**
   * 2. Class Attendance Report
   */
  async getClassReport(classId, queryParams = {}) {
    const { sectionId } = queryParams;

    const classDoc = await Class.findById(classId).populate('departmentId', 'name code');
    if (!classDoc) {
      throw new AppError('Class not found', 404);
    }

    let sectionDoc = null;
    if (sectionId) {
      sectionDoc = await Section.findById(sectionId);
    }

    const studentFilter = { classId, isActive: true };
    if (sectionId) {
      studentFilter.sectionId = sectionId;
    }

    const students = await Student.find(studentFilter)
      .populate('sectionId', 'displayName name')
      .sort({ registerNumber: 1 });

    const studentMetrics = [];
    let sumPercentages = 0;
    let shortageCount = 0;
    let criticalCount = 0;

    for (const st of students) {
      const summary = await attendanceCalculationService.getStudentSummary(st._id);
      sumPercentages += summary.overall.overallPercentage;
      if (summary.overall.isShortage) shortageCount += 1;
      if (summary.overall.status === 'CRITICAL') criticalCount += 1;

      studentMetrics.push({
        studentId: st._id,
        registerNumber: st.registerNumber,
        name: st.name,
        sectionName: st.sectionId?.displayName || `Sec ${st.sectionId?.name}`,
        totalConducted: summary.overall.totalConducted,
        totalAttended: summary.overall.totalAttended,
        overallPercentage: summary.overall.overallPercentage,
        status: summary.overall.status,
        shortageSubjectsCount: summary.overall.shortageSubjectsCount,
      });
    }

    const averagePercentage =
      students.length > 0 ? Math.round((sumPercentages / students.length) * 10) / 10 : 100;

    return {
      generatedAt: new Date(),
      type: 'CLASS_REPORT',
      class: {
        id: classDoc._id,
        name: classDoc.name,
        year: classDoc.year,
        semester: classDoc.semester,
        programme: classDoc.programme,
        department: classDoc.departmentId?.name,
        section: sectionDoc ? sectionDoc.displayName || `Sec ${sectionDoc.name}` : 'All Sections',
      },
      stats: {
        totalStudents: students.length,
        averagePercentage,
        shortageCount,
        criticalCount,
      },
      students: studentMetrics,
    };
  }

  /**
   * 3. Subject Attendance Report
   */
  async getSubjectReport(subjectId, queryParams = {}) {
    const { classId, sectionId } = queryParams;

    const subjectDoc = await Subject.findById(subjectId).populate('departmentId', 'name code');
    if (!subjectDoc) {
      throw new AppError('Subject not found', 404);
    }

    // Sessions conducted for this subject
    const sessionFilter = { subjectId, isActive: true };
    if (classId) sessionFilter.classId = classId;
    if (sectionId) sessionFilter.sectionId = sectionId;

    const totalSessions = await AttendanceSession.countDocuments(sessionFilter);

    // Eligible students
    const studentFilter = { isActive: true };
    if (classId) studentFilter.classId = classId;
    if (sectionId) studentFilter.sectionId = sectionId;

    const students = await Student.find(studentFilter)
      .populate('classId', 'name')
      .populate('sectionId', 'displayName name')
      .sort({ registerNumber: 1 });

    const studentSubjectRows = [];
    let sumPercentages = 0;
    let shortageCount = 0;

    for (const st of students) {
      const summary = await attendanceCalculationService.getStudentSummary(st._id);
      const sub = summary.subjects.find((s) => s.subjectId.toString() === subjectId.toString());

      if (sub) {
        sumPercentages += sub.percentage;
        if (sub.isShortage) shortageCount += 1;

        studentSubjectRows.push({
          studentId: st._id,
          registerNumber: st.registerNumber,
          name: st.name,
          className: st.classId?.name,
          sectionName: st.sectionId?.displayName || `Sec ${st.sectionId?.name}`,
          conducted: sub.conducted,
          attended: sub.attended,
          percentage: sub.percentage,
          status: sub.status,
          classesToRecover: sub.classesToRecover,
        });
      }
    }

    const averagePercentage =
      studentSubjectRows.length > 0
        ? Math.round((sumPercentages / studentSubjectRows.length) * 10) / 10
        : 100;

    return {
      generatedAt: new Date(),
      type: 'SUBJECT_REPORT',
      subject: {
        id: subjectDoc._id,
        code: subjectDoc.subjectCode,
        name: subjectDoc.subjectName,
        type: subjectDoc.subjectType,
        credits: subjectDoc.credits,
        department: subjectDoc.departmentId?.name,
      },
      stats: {
        totalSessionsConducted: totalSessions,
        enrolledStudentsCount: studentSubjectRows.length,
        averagePercentage,
        shortageCount,
      },
      students: studentSubjectRows,
    };
  }

  /**
   * 4. Shortage Report
   */
  async getShortageReport(queryParams = {}) {
    const list = await attendanceCalculationService.getShortageList(queryParams);

    const summaryByStatus = {
      CAUTION: 0,
      WARNING: 0,
      CRITICAL: 0,
    };

    list.forEach((entry) => {
      if (summaryByStatus[entry.status] !== undefined) {
        summaryByStatus[entry.status] += 1;
      }
    });

    return {
      generatedAt: new Date(),
      type: 'SHORTAGE_REPORT',
      totalShortages: list.length,
      breakdown: summaryByStatus,
      shortages: list,
    };
  }
}

module.exports = new ReportService();
