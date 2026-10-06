const service = require('../services/timetableService');
const { sendSuccess } = require('../utils/apiResponse');

class TimetableController {
  async getAll(req, res, next) {
    try {
      const result = await service.getAll(req.query);
      return sendSuccess(res, 200, 'Timetable entries retrieved successfully', result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const entry = await service.getById(req.params.id);
      return sendSuccess(res, 200, 'Timetable entry details retrieved', entry);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const entry = await service.create(req.body, req.user?.id);
      return sendSuccess(res, 201, 'Timetable entry created successfully', entry);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const entry = await service.update(req.params.id, req.body);
      return sendSuccess(res, 200, 'Timetable entry updated successfully', entry);
    } catch (err) {
      next(err);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      const entry = await service.toggleStatus(req.params.id, req.body.isActive);
      return sendSuccess(res, 200, 'Timetable entry status updated', entry);
    } catch (err) {
      next(err);
    }
  }

  async remove(req, res, next) {
    try {
      const result = await service.delete(req.params.id);
      return sendSuccess(res, 200, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  async getMyTimetable(req, res, next) {
    try {
      const result = await service.getFacultyTimetableMe(req.user.id, req.query);
      return sendSuccess(res, 200, 'Personal faculty timetable retrieved', result);
    } catch (err) {
      next(err);
    }
  }

  async getFacultyDashboardSummary(req, res, next) {
    try {
      const result = await service.getFacultyDashboardSummary(req.user.id);
      return sendSuccess(res, 200, 'Faculty dashboard summary retrieved', result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TimetableController();
