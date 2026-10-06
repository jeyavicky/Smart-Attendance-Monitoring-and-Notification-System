const Faculty = require('../models/Faculty');
const User = require('../models/User');
const Department = require('../models/Department');
const AppError = require('../utils/appError');
const { ROLES } = require('../config/constants');

class FacultyService {
  async getAll(queryParams = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      department,
      status,
      sortBy = 'employeeId',
      sortOrder = 'asc',
    } = queryParams;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};

    if (search && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { employeeId: { $regex: sanitized, $options: 'i' } },
        { email: { $regex: sanitized, $options: 'i' } },
      ];
    }

    if (department) filter.departmentId = department;

    if (status !== undefined && status !== '') {
      filter.isActive = status === 'true' || status === true;
    }

    const sortableFields = ['employeeId', 'name', 'email', 'designation', 'createdAt'];
    const sortField = sortableFields.includes(sortBy) ? sortBy : 'employeeId';
    const sortDirection = sortOrder.toLowerCase() === 'desc' ? -1 : 1;

    const [items, totalItems] = await Promise.all([
      Faculty.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .populate('departmentId', 'code name shortName')
        .populate('userId', 'name email role isActive lastLogin')
        .populate('createdBy', 'name email'),
      Faculty.countDocuments(filter),
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
    const faculty = await Faculty.findById(id)
      .populate('departmentId', 'code name shortName')
      .populate('userId', 'name email role isActive lastLogin')
      .populate('createdBy', 'name email');

    if (!faculty) {
      throw new AppError('Faculty profile not found', 404);
    }
    return faculty;
  }

  async getByUserId(userId) {
    const faculty = await Faculty.findOne({ userId })
      .populate('departmentId', 'code name shortName')
      .populate('userId', 'name email role isActive lastLogin');

    if (!faculty) {
      throw new AppError('Faculty academic profile not found for this user', 404);
    }
    return faculty;
  }

  async create(data, adminId) {
    const {
      name,
      employeeId,
      email,
      phone,
      departmentId,
      designation = 'Assistant Professor',
      qualification = '',
      initialPassword = 'FacultyPassword123!',
      isActive = true,
    } = data;

    const normalizedEmployeeId = employeeId.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate employee ID
    const existingEmp = await Faculty.findOne({ employeeId: normalizedEmployeeId });
    if (existingEmp) {
      throw new AppError(`A faculty member with Employee ID '${normalizedEmployeeId}' already exists`, 409);
    }

    // Check duplicate email in Faculty and User
    const existingFacultyEmail = await Faculty.findOne({ email: normalizedEmail });
    if (existingFacultyEmail) {
      throw new AppError(`Faculty email '${normalizedEmail}' is already registered`, 409);
    }

    const existingUserEmail = await User.findOne({ email: normalizedEmail });
    if (existingUserEmail) {
      throw new AppError(`User account with email '${normalizedEmail}' already exists`, 409);
    }

    // Verify department exists and is active
    const department = await Department.findById(departmentId);
    if (!department) {
      throw new AppError('Specified department does not exist', 404);
    }

    let createdUser = null;
    let createdFaculty = null;

    try {
      // Step 1: Create authentication identity User
      const passwordHash = await User.hashPassword(initialPassword);
      createdUser = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: ROLES.FACULTY,
        isActive: Boolean(isActive),
      });

      // Step 2: Create academic Faculty profile
      createdFaculty = await Faculty.create({
        userId: createdUser._id,
        employeeId: normalizedEmployeeId,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone ? phone.trim() : '',
        departmentId,
        designation: designation.trim(),
        qualification: qualification.trim(),
        isActive: Boolean(isActive),
        createdBy: adminId || null,
      });

      return await this.getById(createdFaculty._id);
    } catch (err) {
      // Rollback logic if one succeeded and the other threw an error
      if (createdUser && !createdFaculty) {
        await User.findByIdAndDelete(createdUser._id).catch(() => {});
      }
      throw err;
    }
  }

  async update(id, data) {
    const faculty = await Faculty.findById(id);
    if (!faculty) {
      throw new AppError('Faculty profile not found', 404);
    }

    const user = await User.findById(faculty.userId);

    // Validate employeeId if changed
    if (data.employeeId && data.employeeId.trim().toUpperCase() !== faculty.employeeId) {
      const newEmpId = data.employeeId.trim().toUpperCase();
      const duplicateEmp = await Faculty.findOne({ employeeId: newEmpId, _id: { $ne: id } });
      if (duplicateEmp) {
        throw new AppError(`A faculty member with Employee ID '${newEmpId}' already exists`, 409);
      }
      faculty.employeeId = newEmpId;
    }

    // Validate email if changed and synchronize with linked User
    if (data.email && data.email.trim().toLowerCase() !== faculty.email) {
      const newEmail = data.email.trim().toLowerCase();
      const duplicateFacEmail = await Faculty.findOne({ email: newEmail, _id: { $ne: id } });
      if (duplicateFacEmail) {
        throw new AppError(`Email '${newEmail}' is already registered to another faculty member`, 409);
      }
      const duplicateUserEmail = await User.findOne({ email: newEmail, _id: { $ne: faculty.userId } });
      if (duplicateUserEmail) {
        throw new AppError(`Email '${newEmail}' is already in use by another user account`, 409);
      }
      faculty.email = newEmail;
      if (user) {
        user.email = newEmail;
      }
    }

    // Synchronize name
    if (data.name) {
      faculty.name = data.name.trim();
      if (user) {
        user.name = data.name.trim();
      }
    }

    if (data.phone !== undefined) faculty.phone = data.phone.trim();
    if (data.departmentId) faculty.departmentId = data.departmentId;
    if (data.designation) faculty.designation = data.designation.trim();
    if (data.qualification !== undefined) faculty.qualification = data.qualification.trim();

    if (data.isActive !== undefined) {
      faculty.isActive = Boolean(data.isActive);
      if (user) {
        user.isActive = Boolean(data.isActive);
      }
    }

    await Promise.all([
      faculty.save(),
      user ? user.save({ validateBeforeSave: false }) : Promise.resolve(),
    ]);

    return await this.getById(faculty._id);
  }

  async toggleStatus(id, isActive) {
    const faculty = await Faculty.findById(id);
    if (!faculty) {
      throw new AppError('Faculty profile not found', 404);
    }

    const nextStatus = isActive !== undefined ? Boolean(isActive) : !faculty.isActive;
    faculty.isActive = nextStatus;

    // Synchronize status with linked User account
    const user = await User.findById(faculty.userId);
    if (user) {
      user.isActive = nextStatus;
      await user.save({ validateBeforeSave: false });
    }

    await faculty.save();
    return faculty;
  }

  async delete(id) {
    const faculty = await Faculty.findById(id);
    if (!faculty) {
      throw new AppError('Faculty profile not found', 404);
    }

    // Soft delete preferred for academic records
    faculty.isActive = false;
    await faculty.save();

    const user = await User.findById(faculty.userId);
    if (user) {
      user.isActive = false;
      await user.save({ validateBeforeSave: false });
    }

    return { id, message: 'Faculty deactivated successfully' };
  }
}

module.exports = new FacultyService();
