const sectionService = require('../services/sectionService');
const { sendSuccess } = require('../utils/apiResponse');

const getAll = async (req, res, next) => {
  try {
    const result = await sectionService.getAll(req.query);
    return sendSuccess(res, 200, 'Sections retrieved successfully', result.items, result.pagination);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await sectionService.getById(req.params.id);
    return sendSuccess(res, 200, 'Section details retrieved', item);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const item = await sectionService.create(req.body, req.user._id);
    return sendSuccess(res, 201, 'Section created successfully', item);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await sectionService.update(req.params.id, req.body);
    return sendSuccess(res, 200, 'Section updated successfully', item);
  } catch (err) {
    next(err);
  }
};

const toggleStatus = async (req, res, next) => {
  try {
    const item = await sectionService.toggleStatus(req.params.id, req.body.isActive);
    return sendSuccess(res, 200, `Section status updated to ${item.isActive ? 'Active' : 'Inactive'}`, item);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await sectionService.delete(req.params.id);
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
