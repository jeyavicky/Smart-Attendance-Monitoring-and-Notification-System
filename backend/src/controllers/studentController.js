const studentService = require('../services/studentService');
const { sendSuccess } = require('../utils/apiResponse');

const getAll = async (req, res, next) => {
  try {
    const result = await studentService.getAll(req.query);
    return sendSuccess(res, 200, 'Student profiles retrieved successfully', result.items, result.pagination);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await studentService.getById(req.params.id);
    return sendSuccess(res, 200, 'Student profile details retrieved', item);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const item = await studentService.create(req.body, req.user._id);
    return sendSuccess(res, 201, 'Student created successfully', item);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await studentService.update(req.params.id, req.body);
    return sendSuccess(res, 200, 'Student profile updated successfully', item);
  } catch (err) {
    next(err);
  }
};

const toggleStatus = async (req, res, next) => {
  try {
    const item = await studentService.toggleStatus(req.params.id, req.body.isActive);
    return sendSuccess(res, 200, `Student status updated to ${item.isActive ? 'Active' : 'Inactive'}`, item);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await studentService.delete(req.params.id);
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
