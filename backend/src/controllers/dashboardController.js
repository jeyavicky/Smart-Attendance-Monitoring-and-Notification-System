const dashboardService = require('../services/dashboardService');
const { sendSuccess } = require('../utils/apiResponse');

const getAdminSummary = async (req, res, next) => {
  try {
    const summary = await dashboardService.getAdminSummary();
    return sendSuccess(res, 200, 'Admin dashboard summary retrieved', summary);
  } catch (err) {
    next(err);
  }
};

const getFacultyProfileMe = async (req, res, next) => {
  try {
    const profile = await dashboardService.getFacultyProfile(req.user._id);
    return sendSuccess(res, 200, 'Faculty profile retrieved', profile);
  } catch (err) {
    next(err);
  }
};

const getStudentProfileMe = async (req, res, next) => {
  try {
    const profile = await dashboardService.getStudentProfile(req.user._id);
    return sendSuccess(res, 200, 'Student profile retrieved', profile);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminSummary,
  getFacultyProfileMe,
  getStudentProfileMe,
};
