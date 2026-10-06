const academicYearService = require('../services/academicYearService');
const { sendSuccess } = require('../utils/apiResponse');

const getAll = async (req, res, next) => {
  try {
    const result = await academicYearService.getAll(req.query);
    return sendSuccess(res, 200, 'Academic years retrieved successfully', result.items, result.pagination);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await academicYearService.getById(req.params.id);
    return sendSuccess(res, 200, 'Academic year details retrieved', item);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const item = await academicYearService.create(req.body, req.user._id);
    return sendSuccess(res, 201, 'Academic year created successfully', item);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await academicYearService.update(req.params.id, req.body);
    return sendSuccess(res, 200, 'Academic year updated successfully', item);
  } catch (err) {
    next(err);
  }
};

const toggleStatus = async (req, res, next) => {
  try {
    const item = await academicYearService.toggleStatus(req.params.id, req.body.isActive);
    return sendSuccess(res, 200, `Academic year status updated to ${item.isActive ? 'Active' : 'Inactive'}`, item);
  } catch (err) {
    next(err);
  }
};

const setCurrent = async (req, res, next) => {
  try {
    const item = await academicYearService.setCurrent(req.params.id);
    return sendSuccess(res, 200, `Academic year '${item.name}' designated as current academic year`, item);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await academicYearService.delete(req.params.id);
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
  setCurrent,
  remove,
};
