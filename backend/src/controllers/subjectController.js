const subjectService = require('../services/subjectService');
const { sendSuccess } = require('../utils/apiResponse');

const getAll = async (req, res, next) => {
  try {
    const result = await subjectService.getAll(req.query);
    return sendSuccess(res, 200, 'Subjects retrieved successfully', result.items, result.pagination);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await subjectService.getById(req.params.id);
    return sendSuccess(res, 200, 'Subject details retrieved', item);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const item = await subjectService.create(req.body, req.user._id);
    return sendSuccess(res, 201, 'Subject created successfully', item);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await subjectService.update(req.params.id, req.body);
    return sendSuccess(res, 200, 'Subject updated successfully', item);
  } catch (err) {
    next(err);
  }
};

const toggleStatus = async (req, res, next) => {
  try {
    const item = await subjectService.toggleStatus(req.params.id, req.body.isActive);
    return sendSuccess(res, 200, `Subject status updated to ${item.isActive ? 'Active' : 'Inactive'}`, item);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await subjectService.delete(req.params.id);
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
