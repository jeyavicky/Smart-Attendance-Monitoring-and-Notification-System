const facultyService = require('../services/facultyService');
const { sendSuccess } = require('../utils/apiResponse');

const getAll = async (req, res, next) => {
  try {
    const result = await facultyService.getAll(req.query);
    return sendSuccess(res, 200, 'Faculty profiles retrieved successfully', result.items, result.pagination);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await facultyService.getById(req.params.id);
    return sendSuccess(res, 200, 'Faculty profile details retrieved', item);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const item = await facultyService.create(req.body, req.user._id);
    return sendSuccess(res, 201, 'Faculty member created successfully', item);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await facultyService.update(req.params.id, req.body);
    return sendSuccess(res, 200, 'Faculty profile updated successfully', item);
  } catch (err) {
    next(err);
  }
};

const toggleStatus = async (req, res, next) => {
  try {
    const item = await facultyService.toggleStatus(req.params.id, req.body.isActive);
    return sendSuccess(res, 200, `Faculty status updated to ${item.isActive ? 'Active' : 'Inactive'}`, item);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await facultyService.delete(req.params.id);
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
