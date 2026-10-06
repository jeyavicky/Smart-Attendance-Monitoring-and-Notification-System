const service = require('../services/facultyMappingService');
const { sendSuccess } = require('../utils/apiResponse');

class FacultyMappingController {
  async getAll(req, res, next) {
    try {
      const result = await service.getAll(req.query);
      return sendSuccess(res, 200, 'Faculty mappings retrieved successfully', result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const mapping = await service.getById(req.params.id);
      return sendSuccess(res, 200, 'Faculty mapping details retrieved', mapping);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const mapping = await service.create(req.body, req.user?.id);
      return sendSuccess(res, 201, 'Faculty mapping created successfully', mapping);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const mapping = await service.update(req.params.id, req.body);
      return sendSuccess(res, 200, 'Faculty mapping updated successfully', mapping);
    } catch (err) {
      next(err);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      const mapping = await service.toggleStatus(req.params.id, req.body.isActive);
      return sendSuccess(res, 200, 'Faculty mapping status updated', mapping);
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

  async getMyMappings(req, res, next) {
    try {
      const result = await service.getFacultyMappingsMe(req.user.id);
      return sendSuccess(res, 200, 'Personal faculty mappings retrieved', result);
    } catch (err) {
      next(err);
    }
  }

  async getWorkload(req, res, next) {
    try {
      const workload = await service.getWorkloadSummary();
      return sendSuccess(res, 200, 'Faculty workload summary retrieved', workload);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new FacultyMappingController();
