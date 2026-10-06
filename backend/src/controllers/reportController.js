const reportService = require('../services/reportService');
const { sendSuccess } = require('../utils/apiResponse');

class ReportController {
  async getStudentReport(req, res, next) {
    try {
      const result = await reportService.getStudentReport(req.params.studentId);
      return sendSuccess(res, 200, 'Student attendance report generated', result);
    } catch (err) {
      next(err);
    }
  }

  async getClassReport(req, res, next) {
    try {
      const result = await reportService.getClassReport(req.params.classId, req.query);
      return sendSuccess(res, 200, 'Class attendance report generated', result);
    } catch (err) {
      next(err);
    }
  }

  async getSubjectReport(req, res, next) {
    try {
      const result = await reportService.getSubjectReport(req.params.subjectId, req.query);
      return sendSuccess(res, 200, 'Subject attendance report generated', result);
    } catch (err) {
      next(err);
    }
  }

  async getShortageReport(req, res, next) {
    try {
      const result = await reportService.getShortageReport(req.query);
      return sendSuccess(res, 200, 'Attendance shortage report generated', result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReportController();
