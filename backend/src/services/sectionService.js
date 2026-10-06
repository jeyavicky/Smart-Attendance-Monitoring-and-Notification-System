const Section = require('../models/Section');
const Class = require('../models/Class');
const Student = require('../models/Student');
const AppError = require('../utils/appError');

class SectionService {
  async getAll(queryParams = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      classId,
      department,
      academicYear,
      year,
      semester,
      status,
      sortBy = 'name',
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
        { code: { $regex: sanitized, $options: 'i' } },
      ];
    }

    if (classId) filter.classId = classId;
    if (department) filter.departmentId = department;
    if (academicYear) filter.academicYearId = academicYear;
    if (year) filter.year = Number(year);
    if (semester) filter.semester = Number(semester);

    if (status !== undefined && status !== '') {
      filter.isActive = status === 'true' || status === true;
    }

    const sortableFields = ['name', 'code', 'capacity', 'createdAt'];
    const sortField = sortableFields.includes(sortBy) ? sortBy : 'name';
    const sortDirection = sortOrder.toLowerCase() === 'desc' ? -1 : 1;

    const [items, totalItems] = await Promise.all([
      Section.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .populate({
          path: 'classId',
          select: 'name programme year semester departmentId academicYearId',
          populate: [
            { path: 'departmentId', select: 'code name' },
            { path: 'academicYearId', select: 'name isCurrent' },
          ],
        })
        .populate('departmentId', 'code name shortName')
        .populate('academicYearId', 'name isCurrent')
        .populate('createdBy', 'name email'),
      Section.countDocuments(filter),
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
    const section = await Section.findById(id)
      .populate({
        path: 'classId',
        select: 'name programme year semester departmentId academicYearId',
        populate: [
          { path: 'departmentId', select: 'code name' },
          { path: 'academicYearId', select: 'name isCurrent' },
        ],
      })
      .populate('departmentId', 'code name shortName')
      .populate('academicYearId', 'name isCurrent')
      .populate('createdBy', 'name email');

    if (!section) {
      throw new AppError('Section not found', 404);
    }
    return section;
  }

  async create(data, adminId) {
    const { name, classId, capacity = 60, isActive } = data;

    const normalizedName = name.trim().toUpperCase();

    // Verify parent class exists
    const classItem = await Class.findById(classId).populate('departmentId', 'code');
    if (!classItem) {
      throw new AppError('Specified class cohort does not exist', 404);
    }
    if (!classItem.isActive) {
      throw new AppError('Specified class cohort is inactive. Cannot create sections in inactive classes.', 400);
    }

    // Check duplicate section name within this class
    const existing = await Section.findOne({
      classId,
      name: normalizedName,
    });
    if (existing) {
      throw new AppError(
        `Section '${normalizedName}' already exists for class '${classItem.name}'`,
        409
      );
    }

    const deptCode = classItem.departmentId?.code || 'CLASS';
    const displayCode = `${deptCode}-${classItem.year}-${classItem.semester}-${normalizedName}`;

    const section = new Section({
      name: normalizedName,
      code: displayCode,
      classId,
      departmentId: classItem.departmentId._id || classItem.departmentId,
      academicYearId: classItem.academicYearId,
      year: classItem.year,
      semester: classItem.semester,
      capacity: Number(capacity) || 60,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: adminId || null,
    });

    await section.save();
    return await this.getById(section._id);
  }

  async update(id, data) {
    const section = await Section.findById(id);
    if (!section) {
      throw new AppError('Section not found', 404);
    }

    if (data.name && data.name.trim().toUpperCase() !== section.name) {
      const newName = data.name.trim().toUpperCase();
      const duplicate = await Section.findOne({
        _id: { $ne: id },
        classId: section.classId,
        name: newName,
      });
      if (duplicate) {
        throw new AppError(`Section '${newName}' already exists for this class cohort`, 409);
      }
      section.name = newName;
    }

    if (data.capacity !== undefined) section.capacity = Number(data.capacity);
    if (data.isActive !== undefined) section.isActive = Boolean(data.isActive);

    await section.save();
    return await this.getById(section._id);
  }

  async toggleStatus(id, isActive) {
    const section = await Section.findById(id);
    if (!section) {
      throw new AppError('Section not found', 404);
    }

    section.isActive = isActive !== undefined ? Boolean(isActive) : !section.isActive;
    await section.save();
    return section;
  }

  async delete(id) {
    const section = await Section.findById(id);
    if (!section) {
      throw new AppError('Section not found', 404);
    }

    const studentsCount = await Student.countDocuments({ sectionId: id });
    if (studentsCount > 0) {
      throw new AppError(
        `Cannot delete section '${section.name}': ${studentsCount} students are enrolled in it. Please deactivate instead.`,
        400
      );
    }

    await section.deleteOne();
    return { id, message: 'Section deleted successfully' };
  }
}

module.exports = new SectionService();
