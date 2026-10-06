const Student = require('../models/Student');
const User = require('../models/User');
const Department = require('../models/Department');
const AcademicYear = require('../models/AcademicYear');
const Class = require('../models/Class');
const Section = require('../models/Section');
const AppError = require('../utils/appError');
const { ROLES } = require('../config/constants');

class StudentService {
  async getAll(queryParams = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      department,
      academicYear,
      classId,
      sectionId,
      year,
      semester,
      status,
      sortBy = 'registerNumber',
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
        { registerNumber: { $regex: sanitized, $options: 'i' } },
        { email: { $regex: sanitized, $options: 'i' } },
      ];
    }

    if (department) filter.departmentId = department;
    if (academicYear) filter.academicYearId = academicYear;
    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;
    if (year) filter.year = Number(year);
    if (semester) filter.semester = Number(semester);

    if (status !== undefined && status !== '') {
      filter.isActive = status === 'true' || status === true;
    }

    const sortableFields = ['registerNumber', 'name', 'email', 'year', 'semester', 'createdAt'];
    const sortField = sortableFields.includes(sortBy) ? sortBy : 'registerNumber';
    const sortDirection = sortOrder.toLowerCase() === 'desc' ? -1 : 1;

    const [items, totalItems] = await Promise.all([
      Student.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .populate('departmentId', 'code name shortName')
        .populate('academicYearId', 'name isCurrent')
        .populate('classId', 'name programme year semester')
        .populate('sectionId', 'name code capacity')
        .populate('userId', 'name email role isActive lastLogin')
        .populate('createdBy', 'name email'),
      Student.countDocuments(filter),
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
    const student = await Student.findById(id)
      .populate('departmentId', 'code name shortName')
      .populate('academicYearId', 'name isCurrent')
      .populate('classId', 'name programme year semester')
      .populate('sectionId', 'name code capacity')
      .populate('userId', 'name email role isActive lastLogin')
      .populate('createdBy', 'name email');

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }
    return student;
  }

  async getByUserId(userId) {
    const student = await Student.findOne({ userId })
      .populate('departmentId', 'code name shortName')
      .populate('academicYearId', 'name isCurrent')
      .populate('classId', 'name programme year semester')
      .populate('sectionId', 'name code capacity')
      .populate('userId', 'name email role isActive lastLogin');

    if (!student) {
      throw new AppError('Student academic profile not found for this user', 404);
    }
    return student;
  }

  async create(data, adminId) {
    const {
      registerNumber,
      name,
      email,
      phone,
      departmentId,
      academicYearId,
      classId,
      sectionId,
      year,
      semester,
      dateOfBirth,
      gender = '',
      initialPassword = 'StudentPassword123!',
      isActive = true,
    } = data;

    const normalizedRegNo = registerNumber.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate register number
    const existingReg = await Student.findOne({ registerNumber: normalizedRegNo });
    if (existingReg) {
      throw new AppError(`A student with register number '${normalizedRegNo}' already exists`, 409);
    }

    // Check duplicate email
    const existingStudentEmail = await Student.findOne({ email: normalizedEmail });
    if (existingStudentEmail) {
      throw new AppError(`Email '${normalizedEmail}' is already registered to a student`, 409);
    }

    const existingUserEmail = await User.findOne({ email: normalizedEmail });
    if (existingUserEmail) {
      throw new AppError(`User account with email '${normalizedEmail}' already exists`, 409);
    }

    // 1. Verify Department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      throw new AppError('Specified department does not exist', 404);
    }

    // 2. Verify Academic Year exists
    const academicYear = await AcademicYear.findById(academicYearId);
    if (!academicYear) {
      throw new AppError('Specified academic year does not exist', 404);
    }

    // 3. Verify Class exists and check relationship with Department and Academic Year
    const classItem = await Class.findById(classId);
    if (!classItem) {
      throw new AppError('Specified class cohort does not exist', 404);
    }

    if (classItem.departmentId.toString() !== departmentId.toString()) {
      throw new AppError(
        `Class cohort '${classItem.name}' does not belong to the selected department (${department.code}). Cross-department class assignment is rejected.`,
        400
      );
    }

    if (classItem.academicYearId.toString() !== academicYearId.toString()) {
      throw new AppError(
        `Class cohort '${classItem.name}' does not belong to academic year '${academicYear.name}'.`,
        400
      );
    }

    // 4. Verify Section exists and belongs to the Class
    const section = await Section.findById(sectionId);
    if (!section) {
      throw new AppError('Specified section does not exist', 404);
    }

    if (section.classId.toString() !== classId.toString()) {
      throw new AppError(
        `Section '${section.name}' does not belong to the selected class cohort '${classItem.name}'.`,
        400
      );
    }

    // 5. Verify Year and Semester match the Class
    const studentYear = year ? Number(year) : classItem.year;
    const studentSem = semester ? Number(semester) : classItem.semester;

    if (studentYear !== classItem.year || studentSem !== classItem.semester) {
      throw new AppError(
        `Student study year (${studentYear}) and semester (${studentSem}) must match the selected class cohort (Year ${classItem.year}, Semester ${classItem.semester}).`,
        400
      );
    }

    let createdUser = null;
    let createdStudent = null;

    try {
      // Step 1: Create authentication user
      const passwordHash = await User.hashPassword(initialPassword);
      createdUser = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: ROLES.STUDENT,
        isActive: Boolean(isActive),
      });

      // Step 2: Create academic Student profile
      createdStudent = await Student.create({
        userId: createdUser._id,
        registerNumber: normalizedRegNo,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone ? phone.trim() : '',
        departmentId,
        academicYearId,
        classId,
        sectionId,
        year: studentYear,
        semester: studentSem,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || '',
        isActive: Boolean(isActive),
        createdBy: adminId || null,
      });

      return await this.getById(createdStudent._id);
    } catch (err) {
      if (createdUser && !createdStudent) {
        await User.findByIdAndDelete(createdUser._id).catch(() => {});
      }
      throw err;
    }
  }

  async update(id, data) {
    const student = await Student.findById(id);
    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const user = await User.findById(student.userId);

    // Validate registerNumber if changed
    if (data.registerNumber && data.registerNumber.trim().toUpperCase() !== student.registerNumber) {
      const newRegNo = data.registerNumber.trim().toUpperCase();
      const duplicate = await Student.findOne({ registerNumber: newRegNo, _id: { $ne: id } });
      if (duplicate) {
        throw new AppError(`A student with register number '${newRegNo}' already exists`, 409);
      }
      student.registerNumber = newRegNo;
    }

    // Validate email if changed and sync with linked User
    if (data.email && data.email.trim().toLowerCase() !== student.email) {
      const newEmail = data.email.trim().toLowerCase();
      const duplicateStudent = await Student.findOne({ email: newEmail, _id: { $ne: id } });
      if (duplicateStudent) {
        throw new AppError(`Email '${newEmail}' is already registered to another student`, 409);
      }
      const duplicateUser = await User.findOne({ email: newEmail, _id: { $ne: student.userId } });
      if (duplicateUser) {
        throw new AppError(`Email '${newEmail}' is already in use by another user account`, 409);
      }
      student.email = newEmail;
      if (user) {
        user.email = newEmail;
      }
    }

    // Sync name
    if (data.name) {
      student.name = data.name.trim();
      if (user) {
        user.name = data.name.trim();
      }
    }

    // If changing class or section or department, validate relationships
    const targetDeptId = data.departmentId || student.departmentId;
    const targetAyId = data.academicYearId || student.academicYearId;
    const targetClassId = data.classId || student.classId;
    const targetSectionId = data.sectionId || student.sectionId;

    if (data.classId || data.departmentId || data.academicYearId || data.sectionId) {
      const classItem = await Class.findById(targetClassId);
      if (!classItem) {
        throw new AppError('Specified class cohort does not exist', 404);
      }
      if (classItem.departmentId.toString() !== targetDeptId.toString()) {
        throw new AppError('Class cohort does not belong to selected department', 400);
      }
      const section = await Section.findById(targetSectionId);
      if (!section) {
        throw new AppError('Specified section does not exist', 404);
      }
      if (section.classId.toString() !== targetClassId.toString()) {
        throw new AppError('Selected section does not belong to selected class cohort', 400);
      }

      student.departmentId = targetDeptId;
      student.academicYearId = targetAyId;
      student.classId = targetClassId;
      student.sectionId = targetSectionId;
      student.year = classItem.year;
      student.semester = classItem.semester;
    }

    if (data.phone !== undefined) student.phone = data.phone.trim();
    if (data.dateOfBirth !== undefined) student.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    if (data.gender !== undefined) student.gender = data.gender;

    if (data.isActive !== undefined) {
      student.isActive = Boolean(data.isActive);
      if (user) {
        user.isActive = Boolean(data.isActive);
      }
    }

    await Promise.all([
      student.save(),
      user ? user.save({ validateBeforeSave: false }) : Promise.resolve(),
    ]);

    return await this.getById(student._id);
  }

  async toggleStatus(id, isActive) {
    const student = await Student.findById(id);
    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const nextStatus = isActive !== undefined ? Boolean(isActive) : !student.isActive;
    student.isActive = nextStatus;

    // Synchronize status with linked User account
    const user = await User.findById(student.userId);
    if (user) {
      user.isActive = nextStatus;
      await user.save({ validateBeforeSave: false });
    }

    await student.save();
    return student;
  }

  async delete(id) {
    const student = await Student.findById(id);
    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    // Soft delete preferred for academic records
    student.isActive = false;
    await student.save();

    const user = await User.findById(student.userId);
    if (user) {
      user.isActive = false;
      await user.save({ validateBeforeSave: false });
    }

    return { id, message: 'Student deactivated successfully' };
  }
}

module.exports = new StudentService();
