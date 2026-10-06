const classService = require('../services/classService');
const { sendSuccess } = require('../utils/apiResponse');

const getAll = async (req, res, next) => {
  try {
    const result = await classService.getAll(req.query);
    return sendSuccess(res, 200, 'Class cohorts retrieved successfully', result.items, result.pagination);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await classService.getById(req.params.id);
    return sendSuccess(res, 200, 'Class cohort details retrieved', item);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const item = await classService.create(req.body, req.user._id);
    return sendSuccess(res, 201, 'Class cohort created successfully', item);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await classService.update(req.params.id, req.body);
    return sendSuccess(res, 200, 'Class cohort updated successfully', item);
  } catch (err) {
    next(err);
  }
};

const toggleStatus = async (req, res, next) => {
  try {
    const item = await classService.toggleStatus(req.params.id, req.body.isActive);
    return sendSuccess(res, 200, `Class cohort status updated to ${item.isActive ? 'Active' : 'Inactive'}`, item);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await classService.delete(req.params.id);
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
