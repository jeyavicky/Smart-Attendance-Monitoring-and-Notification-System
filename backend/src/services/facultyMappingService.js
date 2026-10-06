const FacultySubjectMapping = require('../models/FacultySubjectMapping');
const TimetableEntry = require('../models/TimetableEntry');
const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Department = require('../models/Department');
const AcademicYear = require('../models/AcademicYear');
const AppError = require('../utils/appError');

class FacultyMappingService {
  async getAll(queryParams = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      academicYear,
      department,
      classId,
      sectionId,
      facultyId,
      subjectId,
      semester,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryParams;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};

    if (academicYear) filter.academicYearId = academicYear;
    if (department) filter.departmentId = department;
    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;
    if (facultyId) filter.facultyId = facultyId;
    if (subjectId) filter.subjectId = subjectId;
    if (semester) filter.semester = parseInt(semester, 10);
    if (status !== undefined && status !== '') {
      filter.isActive = status === 'true' || status === true;
    }

    // If text search is specified, find matching faculty or subjects first
    if (search && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(sanitized, 'i');

      const [matchingFaculty, matchingSubjects] = await Promise.all([
        Faculty.find({ $or: [{ name: regex }, { employeeId: regex }] }).select('_id'),
        Subject.find({ $or: [{ subjectCode: regex }, { subjectName: regex }] }).select('_id'),
      ]);

      const facIds = matchingFaculty.map((f) => f._id);
      const subIds = matchingSubjects.map((s) => s._id);

      filter.$or = [
        { facultyId: { $in: facIds } },
        { subjectId: { $in: subIds } },
      ];
    }

    const sortOptions = {};
    const safeSortFields = ['createdAt', 'semester', 'year', 'isActive'];
    if (safeSortFields.includes(sortBy)) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.createdAt = -1;
    }

    const [items, totalItems] = await Promise.all([
      FacultySubjectMapping.find(filter)
        .populate('facultyId', 'name employeeId email designation')
        .populate('subjectId', 'subjectCode subjectName credits subjectType semester')
        .populate('departmentId', 'name code shortName')
        .populate('academicYearId', 'name isCurrent')
        .populate('classId', 'name year semester programme')
        .populate('sectionId', 'name displayName capacity')
        .sort(sortOptions)
        .skip(skip)
        .limit(parsedLimit),
      FacultySubjectMapping.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalItems / parsedLimit) || 1;

    return {
      items,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalItems,
        totalPages,
      },
    };
  }

  async getById(id) {
    const mapping = await FacultySubjectMapping.findById(id)
      .populate('facultyId', 'name employeeId email designation phone')
      .populate('subjectId', 'subjectCode subjectName credits subjectType year semester')
      .populate('departmentId', 'name code shortName')
      .populate('academicYearId', 'name isCurrent startDate endDate')
      .populate('classId', 'name year semester programme')
      .populate('sectionId', 'name displayName capacity');

    if (!mapping) {
      throw new AppError('Faculty Subject Mapping not found', 404);
    }
    return mapping;
  }

  async create(data, userId = null) {
    const {
      facultyId,
      subjectId,
      classId,
      sectionId,
      academicYearId: explicitAyId,
      departmentId: explicitDeptId,
    } = data;

    // 1. Verify referenced entities exist
    const [faculty, subject, classObj, section] = await Promise.all([
      Faculty.findById(facultyId),
      Subject.findById(subjectId),
      Class.findById(classId),
      Section.findById(sectionId),
    ]);

    if (!faculty) throw new AppError('Faculty member not found', 404);
    if (!faculty.isActive) {
      throw new AppError(`Faculty member '${faculty.name}' is inactive. Cannot assign mappings to inactive faculty.`, 400);
    }

    if (!subject) throw new AppError('Subject not found', 404);
    if (!subject.isActive) {
      throw new AppError(`Subject '${subject.subjectCode}' is inactive. Cannot map inactive subjects.`, 400);
    }

    if (!classObj) throw new AppError('Class cohort not found', 404);
    if (!classObj.isActive) {
      throw new AppError(`Class cohort '${classObj.name}' is inactive. Cannot map inactive cohorts.`, 400);
    }

    if (!section) throw new AppError('Section not found', 404);
    if (!section.isActive) {
      throw new AppError(`Section '${section.name}' is inactive. Cannot map inactive sections.`, 400);
    }

    // 2. Derive & verify relational integrity
    const derivedDeptId = classObj.departmentId.toString();
    const derivedAyId = classObj.academicYearId.toString();

    if (explicitDeptId && explicitDeptId.toString() !== derivedDeptId) {
      throw new AppError('Selected class does not belong to the selected department', 400);
    }
    if (explicitAyId && explicitAyId.toString() !== derivedAyId) {
      throw new AppError('Selected class does not belong to the selected academic year', 400);
    }

    // Verify section belongs to class
    const sectionClassId = section.classId._id ? section.classId._id.toString() : section.classId.toString();
    if (sectionClassId !== classObj._id.toString()) {
      throw new AppError(`Section '${section.name}' does not belong to the selected class cohort '${classObj.name}'`, 400);
    }

    // Verify subject semester matches class semester where applicable
    if (subject.semester !== classObj.semester) {
      throw new AppError(
        `Subject '${subject.subjectCode} - ${subject.subjectName}' is designated for Semester ${subject.semester}, but the selected class cohort is Semester ${classObj.semester}.`,
        400
      );
    }

    // Verify Academic Year is active
    const ay = await AcademicYear.findById(derivedAyId);
    if (!ay || !ay.isActive) {
      throw new AppError('Academic Year is inactive or not found', 400);
    }

    // 3. Duplicate mapping prevention
    const existingMapping = await FacultySubjectMapping.findOne({
      facultyId,
      subjectId,
      classId,
      sectionId,
      academicYearId: derivedAyId,
      isActive: true,
    });

    if (existingMapping) {
      throw new AppError(
        `This faculty member is already assigned to this subject and section (${subject.subjectCode} - ${classObj.name} Sec ${section.name}).`,
        409
      );
    }

    // 4. Create mapping document
    const mapping = await FacultySubjectMapping.create({
      facultyId,
      subjectId,
      classId,
      sectionId,
      departmentId: derivedDeptId,
      academicYearId: derivedAyId,
      year: classObj.year,
      semester: classObj.semester,
      createdBy: userId,
      isActive: true,
    });

    return this.getById(mapping._id);
  }

  async update(id, data) {
    const mapping = await FacultySubjectMapping.findById(id);
    if (!mapping) {
      throw new AppError('Faculty Subject Mapping not found', 404);
    }

    const {
      facultyId = mapping.facultyId,
      subjectId = mapping.subjectId,
      classId = mapping.classId,
      sectionId = mapping.sectionId,
    } = data;

    // Check duplicate if key mapping fields change
    const duplicate = await FacultySubjectMapping.findOne({
      _id: { $ne: id },
      facultyId,
      subjectId,
      classId,
      sectionId,
      academicYearId: mapping.academicYearId,
      isActive: true,
    });

    if (duplicate) {
      throw new AppError('This faculty member is already assigned to this subject and section.', 409);
    }

    mapping.facultyId = facultyId;
    mapping.subjectId = subjectId;
    mapping.classId = classId;
    mapping.sectionId = sectionId;

    if (data.isActive !== undefined) {
      mapping.isActive = Boolean(data.isActive);
    }

    await mapping.save();
    return this.getById(mapping._id);
  }

  async toggleStatus(id, isActive) {
    const mapping = await FacultySubjectMapping.findById(id);
    if (!mapping) {
      throw new AppError('Faculty Subject Mapping not found', 404);
    }

    mapping.isActive = isActive !== undefined ? Boolean(isActive) : !mapping.isActive;
    await mapping.save();
    return mapping;
  }

  async delete(id) {
    const mapping = await FacultySubjectMapping.findById(id);
    if (!mapping) {
      throw new AppError('Faculty Subject Mapping not found', 404);
    }

    // Referential check: reject delete if timetable entries reference it
    const timetableCount = await TimetableEntry.countDocuments({
      facultyMappingId: id,
    });

    if (timetableCount > 0) {
      throw new AppError(
        `Cannot permanently delete this faculty mapping because ${timetableCount} timetable entries reference it. Please deactivate the mapping instead.`,
        400
      );
    }

    await mapping.deleteOne();
    return { id, message: 'Faculty mapping deleted successfully' };
  }

  // Personal faculty mappings endpoint (derived strictly from authenticated user)
  async getFacultyMappingsMe(userId) {
    const faculty = await Faculty.findOne({ userId });
    if (!faculty) {
      throw new AppError('No faculty profile linked to current account', 404);
    }

    const mappings = await FacultySubjectMapping.find({
      facultyId: faculty._id,
      isActive: true,
    })
      .populate('subjectId', 'subjectCode subjectName credits subjectType semester')
      .populate('classId', 'name year semester programme')
      .populate('sectionId', 'name displayName capacity')
      .populate('departmentId', 'name code shortName')
      .populate('academicYearId', 'name isCurrent')
      .sort({ semester: 1 });

    return {
      faculty: {
        id: faculty._id,
        name: faculty.name,
        employeeId: faculty.employeeId,
        designation: faculty.designation,
      },
      mappings,
      totalAssigned: mappings.length,
    };
  }

  // Faculty workload summary for admin dashboard / overview
  async getWorkloadSummary() {
    const allFaculty = await Faculty.find({ isActive: true }).select('name employeeId departmentId');
    const allMappings = await FacultySubjectMapping.find({ isActive: true });
    const allTimetable = await TimetableEntry.find({ isActive: true });

    const workloadMap = allFaculty.map((f) => {
      const facMappings = allMappings.filter((m) => m.facultyId.toString() === f._id.toString());
      const uniqueSubjects = new Set(facMappings.map((m) => m.subjectId.toString())).size;
      const uniqueSections = new Set(facMappings.map((m) => `${m.classId}_${m.sectionId}`)).size;
      const weeklyPeriods = allTimetable.filter((t) => t.facultyId.toString() === f._id.toString()).length;

      return {
        facultyId: f._id,
        name: f.name,
        employeeId: f.employeeId,
        totalMappings: facMappings.length,
        uniqueSubjects,
        uniqueSections,
        weeklyPeriods,
      };
    });

    return workloadMap;
  }
}

module.exports = new FacultyMappingService();
