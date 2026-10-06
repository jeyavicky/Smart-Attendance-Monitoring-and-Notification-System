const { Subject } = require('../models/Subject');
const Department = require('../models/Department');
const AcademicYear = require('../models/AcademicYear');
const AppError = require('../utils/appError');

class SubjectService {
  async getAll(queryParams = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      department,
      academicYear,
      year,
      semester,
      subjectType,
      status,
      sortBy = 'subjectCode',
      sortOrder = 'asc',
    } = queryParams;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};

    if (search && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { subjectCode: { $regex: sanitized, $options: 'i' } },
        { subjectName: { $regex: sanitized, $options: 'i' } },
      ];
    }

    if (department) filter.departmentId = department;
    if (academicYear) filter.academicYearId = academicYear;
    if (year) filter.year = Number(year);
    if (semester) filter.semester = Number(semester);
    if (subjectType) filter.subjectType = subjectType;

    if (status !== undefined && status !== '') {
      filter.isActive = status === 'true' || status === true;
    }

    const sortableFields = ['subjectCode', 'subjectName', 'year', 'semester', 'credits', 'createdAt'];
    const sortField = sortableFields.includes(sortBy) ? sortBy : 'subjectCode';
    const sortDirection = sortOrder.toLowerCase() === 'desc' ? -1 : 1;

    const [items, totalItems] = await Promise.all([
      Subject.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .populate('departmentId', 'code name shortName')
        .populate('academicYearId', 'name isCurrent')
        .populate('createdBy', 'name email'),
      Subject.countDocuments(filter),
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
    const subject = await Subject.findById(id)
      .populate('departmentId', 'code name shortName')
      .populate('academicYearId', 'name isCurrent')
      .populate('createdBy', 'name email');

    if (!subject) {
      throw new AppError('Subject not found', 404);
    }
    return subject;
  }

  async create(data, adminId) {
    const {
      subjectCode,
      subjectName,
      departmentId,
      academicYearId,
      year,
      semester,
      subjectType = 'Core',
      credits = 3,
      isActive,
    } = data;

    const normalizedCode = subjectCode.trim().toUpperCase();

    // Check duplicate subject code
    const existing = await Subject.findOne({ subjectCode: normalizedCode });
    if (existing) {
      throw new AppError(`A subject with code '${normalizedCode}' already exists`, 409);
    }

    const parsedYear = Number(year);
    const parsedSemester = Number(semester);

    // Validate logical year-semester
    const expectedMinSem = (parsedYear - 1) * 2 + 1;
    const expectedMaxSem = parsedYear * 2;
    if (parsedSemester < expectedMinSem || parsedSemester > expectedMaxSem) {
      throw new AppError(
        `Invalid semester ${parsedSemester} for Year ${parsedYear}. Expected Semester ${expectedMinSem} or ${expectedMaxSem}.`,
        400
      );
    }

    // Verify department exists and is active
    const department = await Department.findById(departmentId);
    if (!department) {
      throw new AppError('Specified department does not exist', 404);
    }

    // Verify academic year exists
    const academicYear = await AcademicYear.findById(academicYearId);
    if (!academicYear) {
      throw new AppError('Specified academic year does not exist', 404);
    }

    const subject = new Subject({
      subjectCode: normalizedCode,
      subjectName: subjectName.trim(),
      departmentId,
      academicYearId,
      year: parsedYear,
      semester: parsedSemester,
      subjectType,
      credits: Number(credits) || 3,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: adminId || null,
    });

    await subject.save();
    return await this.getById(subject._id);
  }

  async update(id, data) {
    const subject = await Subject.findById(id);
    if (!subject) {
      throw new AppError('Subject not found', 404);
    }

    if (data.subjectCode && data.subjectCode.trim().toUpperCase() !== subject.subjectCode) {
      const newCode = data.subjectCode.trim().toUpperCase();
      const duplicate = await Subject.findOne({ subjectCode: newCode, _id: { $ne: id } });
      if (duplicate) {
        throw new AppError(`A subject with code '${newCode}' already exists`, 409);
      }
      subject.subjectCode = newCode;
    }

    const newYear = data.year !== undefined ? Number(data.year) : subject.year;
    const newSemester = data.semester !== undefined ? Number(data.semester) : subject.semester;

    // Validate logical year-semester
    const expectedMinSem = (newYear - 1) * 2 + 1;
    const expectedMaxSem = newYear * 2;
    if (newSemester < expectedMinSem || newSemester > expectedMaxSem) {
      throw new AppError(
        `Invalid semester ${newSemester} for Year ${newYear}. Expected Semester ${expectedMinSem} or ${expectedMaxSem}.`,
        400
      );
    }

    if (data.subjectName) subject.subjectName = data.subjectName.trim();
    if (data.departmentId) subject.departmentId = data.departmentId;
    if (data.academicYearId) subject.academicYearId = data.academicYearId;
    subject.year = newYear;
    subject.semester = newSemester;
    if (data.subjectType) subject.subjectType = data.subjectType;
    if (data.credits !== undefined) subject.credits = Number(data.credits);
    if (data.isActive !== undefined) subject.isActive = Boolean(data.isActive);

    await subject.save();
    return await this.getById(subject._id);
  }

  async toggleStatus(id, isActive) {
    const subject = await Subject.findById(id);
    if (!subject) {
      throw new AppError('Subject not found', 404);
    }

    subject.isActive = isActive !== undefined ? Boolean(isActive) : !subject.isActive;
    await subject.save();
    return subject;
  }

  async delete(id) {
    const subject = await Subject.findById(id);
    if (!subject) {
      throw new AppError('Subject not found', 404);
    }

    await subject.deleteOne();
    return { id, message: 'Subject deleted successfully' };
  }
}

module.exports = new SubjectService();
