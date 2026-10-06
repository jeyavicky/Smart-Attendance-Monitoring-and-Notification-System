const Class = require('../models/Class');
const Department = require('../models/Department');
const AcademicYear = require('../models/AcademicYear');
const Section = require('../models/Section');
const Student = require('../models/Student');
const AppError = require('../utils/appError');

class ClassService {
  async getAll(queryParams = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      department,
      academicYear,
      year,
      semester,
      programme,
      status,
      sortBy = 'year',
      sortOrder = 'asc',
    } = queryParams;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};

    if (search && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: sanitized, $options: 'i' };
    }

    if (department) filter.departmentId = department;
    if (academicYear) filter.academicYearId = academicYear;
    if (year) filter.year = Number(year);
    if (semester) filter.semester = Number(semester);
    if (programme) filter.programme = programme.trim();

    if (status !== undefined && status !== '') {
      filter.isActive = status === 'true' || status === true;
    }

    const sortableFields = ['name', 'year', 'semester', 'programme', 'createdAt'];
    const sortField = sortableFields.includes(sortBy) ? sortBy : 'year';
    const sortDirection = sortOrder.toLowerCase() === 'desc' ? -1 : 1;

    const [items, totalItems] = await Promise.all([
      Class.find(filter)
        .sort({ [sortField]: sortDirection, semester: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .populate('departmentId', 'code name shortName')
        .populate('academicYearId', 'name isCurrent startDate endDate')
        .populate('createdBy', 'name email'),
      Class.countDocuments(filter),
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
    const classItem = await Class.findById(id)
      .populate('departmentId', 'code name shortName')
      .populate('academicYearId', 'name isCurrent startDate endDate')
      .populate('createdBy', 'name email');

    if (!classItem) {
      throw new AppError('Class cohort not found', 404);
    }
    return classItem;
  }

  async create(data, adminId) {
    const { name, programme = 'B.Tech', departmentId, academicYearId, year, semester, isActive } = data;

    const parsedYear = Number(year);
    const parsedSemester = Number(semester);

    // Validate logical year-semester combination
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
    if (!department.isActive) {
      throw new AppError(`Department '${department.code}' is inactive. Cannot create classes under inactive departments.`, 400);
    }

    // Verify academic year exists
    const academicYear = await AcademicYear.findById(academicYearId);
    if (!academicYear) {
      throw new AppError('Specified academic year does not exist', 404);
    }

    // Check duplicate cohort
    const existing = await Class.findOne({
      departmentId,
      academicYearId,
      programme: programme.trim(),
      year: parsedYear,
      semester: parsedSemester,
    });
    if (existing) {
      throw new AppError(
        `A class for ${programme.trim()} ${department.code} Year ${parsedYear} Sem ${parsedSemester} already exists in academic year ${academicYear.name}`,
        409
      );
    }

    const formattedName = name && name.trim()
      ? name.trim()
      : `${programme.trim()} ${department.code} - Year ${parsedYear} (Sem ${parsedSemester})`;

    const newClass = new Class({
      name: formattedName,
      programme: programme.trim(),
      departmentId,
      academicYearId,
      year: parsedYear,
      semester: parsedSemester,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: adminId || null,
    });

    await newClass.save();
    return await this.getById(newClass._id);
  }

  async update(id, data) {
    const classItem = await Class.findById(id);
    if (!classItem) {
      throw new AppError('Class cohort not found', 404);
    }

    const newYear = data.year !== undefined ? Number(data.year) : classItem.year;
    const newSemester = data.semester !== undefined ? Number(data.semester) : classItem.semester;
    const newDeptId = data.departmentId || classItem.departmentId;
    const newAyId = data.academicYearId || classItem.academicYearId;
    const newProgramme = data.programme ? data.programme.trim() : classItem.programme;

    // Validate logical year-semester
    const expectedMinSem = (newYear - 1) * 2 + 1;
    const expectedMaxSem = newYear * 2;
    if (newSemester < expectedMinSem || newSemester > expectedMaxSem) {
      throw new AppError(
        `Invalid semester ${newSemester} for Year ${newYear}. Expected Semester ${expectedMinSem} or ${expectedMaxSem}.`,
        400
      );
    }

    // Check duplicate
    const duplicate = await Class.findOne({
      _id: { $ne: id },
      departmentId: newDeptId,
      academicYearId: newAyId,
      programme: newProgramme,
      year: newYear,
      semester: newSemester,
    });
    if (duplicate) {
      throw new AppError('Another class cohort with these exact academic parameters already exists', 409);
    }

    if (data.name) classItem.name = data.name.trim();
    classItem.programme = newProgramme;
    classItem.departmentId = newDeptId;
    classItem.academicYearId = newAyId;
    classItem.year = newYear;
    classItem.semester = newSemester;
    if (data.isActive !== undefined) classItem.isActive = Boolean(data.isActive);

    await classItem.save();
    return await this.getById(classItem._id);
  }

  async toggleStatus(id, isActive) {
    const classItem = await Class.findById(id);
    if (!classItem) {
      throw new AppError('Class cohort not found', 404);
    }

    classItem.isActive = isActive !== undefined ? Boolean(isActive) : !classItem.isActive;
    await classItem.save();
    return classItem;
  }

  async delete(id) {
    const classItem = await Class.findById(id);
    if (!classItem) {
      throw new AppError('Class cohort not found', 404);
    }

    const [sectionsCount, studentsCount] = await Promise.all([
      Section.countDocuments({ classId: id }),
      Student.countDocuments({ classId: id }),
    ]);

    if (sectionsCount > 0 || studentsCount > 0) {
      throw new AppError(
        `Cannot delete class '${classItem.name}': ${sectionsCount} sections and ${studentsCount} students are assigned to it. Please deactivate instead.`,
        400
      );
    }

    await classItem.deleteOne();
    return { id, message: 'Class cohort deleted successfully' };
  }
}

module.exports = new ClassService();
