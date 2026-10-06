const Department = require('../models/Department');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const AppError = require('../utils/appError');

class DepartmentService {
  async getAll(queryParams = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      sortBy = 'code',
      sortOrder = 'asc',
    } = queryParams;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};

    if (search && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { code: { $regex: sanitized, $options: 'i' } },
        { name: { $regex: sanitized, $options: 'i' } },
        { shortName: { $regex: sanitized, $options: 'i' } },
      ];
    }

    if (status !== undefined && status !== '') {
      filter.isActive = status === 'true' || status === true;
    }

    const sortableFields = ['code', 'name', 'shortName', 'createdAt'];
    const sortField = sortableFields.includes(sortBy) ? sortBy : 'code';
    const sortDirection = sortOrder.toLowerCase() === 'desc' ? -1 : 1;

    const [items, totalItems] = await Promise.all([
      Department.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .populate('createdBy', 'name email'),
      Department.countDocuments(filter),
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
    const department = await Department.findById(id).populate('createdBy', 'name email');
    if (!department) {
      throw new AppError('Department not found', 404);
    }
    return department;
  }

  async create(data, adminId) {
    const { code, name, shortName, isActive } = data;

    const normalizedCode = code.trim().toUpperCase();
    const normalizedName = name.trim();

    const existingCode = await Department.findOne({ code: normalizedCode });
    if (existingCode) {
      throw new AppError(`A department with code '${normalizedCode}' already exists`, 409);
    }

    const existingName = await Department.findOne({ name: normalizedName });
    if (existingName) {
      throw new AppError(`A department with name '${normalizedName}' already exists`, 409);
    }

    const department = new Department({
      code: normalizedCode,
      name: normalizedName,
      shortName: shortName ? shortName.trim() : normalizedCode,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: adminId || null,
    });

    await department.save();
    return department;
  }

  async update(id, data) {
    const department = await Department.findById(id);
    if (!department) {
      throw new AppError('Department not found', 404);
    }

    if (data.code && data.code.trim().toUpperCase() !== department.code) {
      const newCode = data.code.trim().toUpperCase();
      const duplicateCode = await Department.findOne({ code: newCode, _id: { $ne: id } });
      if (duplicateCode) {
        throw new AppError(`A department with code '${newCode}' already exists`, 409);
      }
      department.code = newCode;
    }

    if (data.name && data.name.trim() !== department.name) {
      const newName = data.name.trim();
      const duplicateName = await Department.findOne({ name: newName, _id: { $ne: id } });
      if (duplicateName) {
        throw new AppError(`A department with name '${newName}' already exists`, 409);
      }
      department.name = newName;
    }

    if (data.shortName !== undefined) department.shortName = data.shortName.trim();
    if (data.isActive !== undefined) department.isActive = Boolean(data.isActive);

    await department.save();
    return department;
  }

  async toggleStatus(id, isActive) {
    const department = await Department.findById(id);
    if (!department) {
      throw new AppError('Department not found', 404);
    }

    department.isActive = isActive !== undefined ? Boolean(isActive) : !department.isActive;
    await department.save();
    return department;
  }

  async delete(id) {
    const department = await Department.findById(id);
    if (!department) {
      throw new AppError('Department not found', 404);
    }

    // Referential integrity check across related entities
    const [classesCount, subjectsCount, facultyCount, studentsCount] = await Promise.all([
      Class.countDocuments({ departmentId: id }),
      Subject.countDocuments({ departmentId: id }),
      Faculty.countDocuments({ departmentId: id }),
      Student.countDocuments({ departmentId: id }),
    ]);

    if (classesCount > 0 || subjectsCount > 0 || facultyCount > 0 || studentsCount > 0) {
      throw new AppError(
        `Cannot delete department '${department.code}': Dependencies exist (${classesCount} classes, ${subjectsCount} subjects, ${facultyCount} faculty, ${studentsCount} students). Please deactivate instead.`,
        400
      );
    }

    await department.deleteOne();
    return { id, message: 'Department deleted successfully' };
  }
}

module.exports = new DepartmentService();
