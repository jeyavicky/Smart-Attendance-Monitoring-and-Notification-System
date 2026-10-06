const AcademicYear = require('../models/AcademicYear');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const AppError = require('../utils/appError');

class AcademicYearService {
  async getAll(queryParams = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      isCurrent,
      sortBy = 'startYear',
      sortOrder = 'desc',
    } = queryParams;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};

    if (search && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: sanitized, $options: 'i' };
    }

    if (status !== undefined && status !== '') {
      filter.isActive = status === 'true' || status === true;
    }

    if (isCurrent !== undefined && isCurrent !== '') {
      filter.isCurrent = isCurrent === 'true' || isCurrent === true;
    }

    const sortableFields = ['name', 'startYear', 'endYear', 'startDate', 'endDate', 'createdAt'];
    const sortField = sortableFields.includes(sortBy) ? sortBy : 'startYear';
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;

    const [items, totalItems] = await Promise.all([
      AcademicYear.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .populate('createdBy', 'name email'),
      AcademicYear.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalItems,
        totalPages: Math.ceil(totalItems / parsedLimit) || 1,
      },
    };
  }

  async getById(id) {
    const academicYear = await AcademicYear.findById(id).populate('createdBy', 'name email');
    if (!academicYear) {
      throw new AppError('Academic Year not found', 404);
    }
    return academicYear;
  }

  async create(data, adminId) {
    const { name, startYear, endYear, startDate, endDate, isCurrent, isActive } = data;

    const existing = await AcademicYear.findOne({ name: name.trim() });
    if (existing) {
      throw new AppError(`Academic Year with name '${name.trim()}' already exists`, 409);
    }

    if (Number(startYear) >= Number(endYear)) {
      throw new AppError('End year must be strictly greater than start year', 400);
    }

    if (new Date(startDate) >= new Date(endDate)) {
      throw new AppError('End date must be strictly after start date', 400);
    }

    const academicYear = new AcademicYear({
      name: name.trim(),
      startYear: Number(startYear),
      endYear: Number(endYear),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isCurrent: Boolean(isCurrent),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: adminId || null,
    });

    await academicYear.save();
    return academicYear;
  }

  async update(id, data) {
    const academicYear = await AcademicYear.findById(id);
    if (!academicYear) {
      throw new AppError('Academic Year not found', 404);
    }

    if (data.name && data.name.trim() !== academicYear.name) {
      const duplicate = await AcademicYear.findOne({
        name: data.name.trim(),
        _id: { $ne: id },
      });
      if (duplicate) {
        throw new AppError(`Academic Year with name '${data.name.trim()}' already exists`, 409);
      }
      academicYear.name = data.name.trim();
    }

    if (data.startYear !== undefined) academicYear.startYear = Number(data.startYear);
    if (data.endYear !== undefined) academicYear.endYear = Number(data.endYear);
    if (academicYear.startYear >= academicYear.endYear) {
      throw new AppError('End year must be strictly greater than start year', 400);
    }

    if (data.startDate !== undefined) academicYear.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) academicYear.endDate = new Date(data.endDate);
    if (academicYear.startDate >= academicYear.endDate) {
      throw new AppError('End date must be strictly after start date', 400);
    }

    if (data.isCurrent !== undefined) academicYear.isCurrent = Boolean(data.isCurrent);
    if (data.isActive !== undefined) academicYear.isActive = Boolean(data.isActive);

    await academicYear.save();
    return academicYear;
  }

  async toggleStatus(id, isActive) {
    const academicYear = await AcademicYear.findById(id);
    if (!academicYear) {
      throw new AppError('Academic Year not found', 404);
    }

    const nextStatus = isActive !== undefined ? Boolean(isActive) : !academicYear.isActive;

    // If deactivating the current academic year, reject or warn
    if (!nextStatus && academicYear.isCurrent) {
      throw new AppError('Cannot deactivate the currently active academic year. Designate another year as current first.', 400);
    }

    academicYear.isActive = nextStatus;
    await academicYear.save();
    return academicYear;
  }

  async setCurrent(id) {
    const academicYear = await AcademicYear.findById(id);
    if (!academicYear) {
      throw new AppError('Academic Year not found', 404);
    }

    if (!academicYear.isActive) {
      throw new AppError('Cannot set an inactive academic year as current', 400);
    }

    academicYear.isCurrent = true;
    await academicYear.save();
    return academicYear;
  }

  async delete(id) {
    const academicYear = await AcademicYear.findById(id);
    if (!academicYear) {
      throw new AppError('Academic Year not found', 404);
    }

    // Referential integrity check
    const [classesCount, subjectsCount, studentsCount] = await Promise.all([
      Class.countDocuments({ academicYearId: id }),
      Subject.countDocuments({ academicYearId: id }),
      Student.countDocuments({ academicYearId: id }),
    ]);

    if (classesCount > 0 || subjectsCount > 0 || studentsCount > 0) {
      throw new AppError(
        `Cannot delete academic year: ${classesCount} classes, ${subjectsCount} subjects, and ${studentsCount} students depend on it. Use deactivation instead.`,
        400
      );
    }

    await academicYear.deleteOne();
    return { id, message: 'Academic Year deleted successfully' };
  }
}

module.exports = new AcademicYearService();
