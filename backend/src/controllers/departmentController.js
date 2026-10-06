const departmentService = require('../services/departmentService');
const { sendSuccess } = require('../utils/apiResponse');

const getAll = async (req, res, next) => {
  try {
    const result = await departmentService.getAll(req.query);
    return sendSuccess(res, 200, 'Departments retrieved successfully', result.items, result.pagination);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await departmentService.getById(req.params.id);
    return sendSuccess(res, 200, 'Department details retrieved', item);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const item = await departmentService.create(req.body, req.user._id);
    return sendSuccess(res, 201, 'Department created successfully', item);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await departmentService.update(req.params.id, req.body);
    return sendSuccess(res, 200, 'Department updated successfully', item);
  } catch (err) {
    next(err);
  }
};

const toggleStatus = async (req, res, next) => {
  try {
    const item = await departmentService.toggleStatus(req.params.id, req.body.isActive);
    return sendSuccess(res, 200, `Department status updated to ${item.isActive ? 'Active' : 'Inactive'}`, item);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await departmentService.delete(req.params.id);
    return sendSuccess(res, 200, result.message, result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  toggleStatus,
  remove,
};
