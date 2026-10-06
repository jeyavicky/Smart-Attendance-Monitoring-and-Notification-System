const service = require('../services/attendanceService');
const calculationService = require('../services/attendanceCalculationService');
const Student = require('../models/Student');
const AppError = require('../utils/appError');
const { sendSuccess } = require('../utils/apiResponse');

class AttendanceController {
  async getStudents(req, res, next) {
    try {
      const result = await service.getStudentsForMarking(req.query, req.user);
      return sendSuccess(res, 200, 'Student roster retrieved for attendance marking', result);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const result = await service.createSession(req.body, req.user);
      return sendSuccess(res, 201, 'Attendance recorded successfully', result);
    } catch (err) {
      next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const result = await service.getSessions(req.query, req.user);
      return sendSuccess(res, 200, 'Attendance sessions retrieved successfully', result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const result = await service.getSessionById(req.params.id, req.user);
      return sendSuccess(res, 200, 'Attendance session details retrieved', result);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const result = await service.updateSession(req.params.id, req.body, req.user);
      return sendSuccess(res, 200, 'Attendance session updated successfully', result);
    } catch (err) {
      next(err);
    }
  }

  async cancel(req, res, next) {
    try {
      const result = await service.cancelSession(req.params.id, req.user);
      return sendSuccess(res, 200, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  async getToday(req, res, next) {
    try {
      const result = await service.getTodayTimetableWithAttendance(req.user._id);
      return sendSuccess(res, 200, "Today's attendance schedule retrieved", result);
    } catch (err) {
      next(err);
    }
  }

  // Student specific methods
  async getStudentMe(req, res, next) {
    try {
      const student = await Student.findOne({ userId: req.user._id });
      if (!student) {
        throw new AppError('No student profile linked to current account', 404);
      }
      const result = await calculationService.getStudentSummary(student._id);
      return sendSuccess(res, 200, 'Student attendance summary retrieved', result);
    } catch (err) {
      next(err);
    }
  }

  async getStudentSubjects(req, res, next) {
    try {
      const student = await Student.findOne({ userId: req.user._id });
      if (!student) {
        throw new AppError('No student profile linked to current account', 404);
      }
      const result = await calculationService.getStudentSummary(student._id);
      return sendSuccess(res, 200, 'Student subject attendance retrieved', result.subjects);
    } catch (err) {
      next(err);
    }
  }

  async getStudentHistory(req, res, next) {
    try {
      const student = await Student.findOne({ userId: req.user._id });
      if (!student) {
        throw new AppError('No student profile linked to current account', 404);
      }
      const result = await calculationService.getStudentHistory(student._id, req.query);
      return sendSuccess(res, 200, 'Student attendance history retrieved', result);
    } catch (err) {
      next(err);
    }
  }

  // Shortage and overview methods
  async getShortage(req, res, next) {
    try {
      const result = await calculationService.getShortageList(req.query);
      return sendSuccess(res, 200, 'Shortage students list retrieved', result);
    } catch (err) {
      next(err);
    }
  }

  async getFacultyShortage(req, res, next) {
    try {
      const result = await calculationService.getFacultyShortageStudents(req.user._id);
      return sendSuccess(res, 200, 'Assigned shortage students retrieved', result);
    } catch (err) {
      next(err);
    }
  }

  async getAdminOverview(req, res, next) {
    try {
      const result = await calculationService.getAdminOverview();
      return sendSuccess(res, 200, 'Admin attendance overview retrieved', result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AttendanceController();
