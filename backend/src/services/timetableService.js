const TimetableEntry = require('../models/TimetableEntry');
const FacultySubjectMapping = require('../models/FacultySubjectMapping');
const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const Section = require('../models/Section');
const AppError = require('../utils/appError');

class TimetableService {
  async getAll(queryParams = {}) {
    const {
      page = 1,
      limit = 50,
      academicYear,
      department,
      classId,
      sectionId,
      facultyId,
      dayOfWeek,
      period,
      status,
      sortBy = 'dayOfWeek',
      sortOrder = 'asc',
      format,
    } = queryParams;

    const filter = {};

    if (academicYear) filter.academicYearId = academicYear;
    if (department) filter.departmentId = department;
    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;
    if (facultyId) filter.facultyId = facultyId;
    if (dayOfWeek) filter.dayOfWeek = dayOfWeek;
    if (period) filter.period = parseInt(period, 10);
    if (status !== undefined && status !== '') {
      filter.isActive = status === 'true' || status === true;
    }

    // If grid format requested (for weekly schedule views)
    if (format === 'grid') {
      const entries = await TimetableEntry.find(filter)
        .populate('facultyId', 'name employeeId')
        .populate('subjectId', 'subjectCode subjectName subjectType')
        .populate('classId', 'name')
        .populate('sectionId', 'name displayName')
        .sort({ period: 1 });

      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const grid = {};
      dayOrder.forEach((day) => {
        grid[day] = {};
        for (let p = 1; p <= 8; p++) {
          grid[day][p] = null;
        }
      });

      entries.forEach((entry) => {
        if (grid[entry.dayOfWeek]) {
          grid[entry.dayOfWeek][entry.period] = entry;
        }
      });

      return {
        grid,
        totalEntries: entries.length,
      };
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (parsedPage - 1) * parsedLimit;

    const [items, totalItems] = await Promise.all([
      TimetableEntry.find(filter)
        .populate('facultyId', 'name employeeId email designation')
        .populate('subjectId', 'subjectCode subjectName credits subjectType')
        .populate('classId', 'name year semester programme')
        .populate('sectionId', 'name displayName capacity')
        .populate('departmentId', 'name code shortName')
        .populate('academicYearId', 'name isCurrent')
        .sort({ dayOfWeek: 1, period: 1 })
        .skip(skip)
        .limit(parsedLimit),
      TimetableEntry.countDocuments(filter),
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
    const entry = await TimetableEntry.findById(id)
      .populate('facultyId', 'name employeeId email designation phone')
      .populate('subjectId', 'subjectCode subjectName credits subjectType')
      .populate('classId', 'name year semester programme')
      .populate('sectionId', 'name displayName capacity')
      .populate('departmentId', 'name code shortName')
      .populate('academicYearId', 'name isCurrent');

    if (!entry) {
      throw new AppError('Timetable Entry not found', 404);
    }
    return entry;
  }

  async create(data, userId = null) {
    const {
      facultyMappingId,
      dayOfWeek,
      period,
      startTime = '09:00',
      endTime = '09:50',
      room = '',
    } = data;

    // 1. Verify Faculty Mapping exists and is active
    const mapping = await FacultySubjectMapping.findById(facultyMappingId)
      .populate('facultyId', 'name employeeId isActive')
      .populate('subjectId', 'subjectCode subjectName isActive')
      .populate('classId', 'name isActive')
      .populate('sectionId', 'name displayName isActive')
      .populate('academicYearId', 'name isActive');

    if (!mapping) {
      throw new AppError('Specified Faculty Mapping does not exist', 404);
    }
    if (!mapping.isActive) {
      throw new AppError('Cannot schedule timetable entry for an inactive faculty mapping', 400);
    }
    if (!mapping.facultyId?.isActive) {
      throw new AppError(`Faculty member '${mapping.facultyId.name}' is inactive. Cannot schedule timetable periods.`, 400);
    }

    const parsedPeriod = parseInt(period, 10);
    if (!parsedPeriod || parsedPeriod < 1 || parsedPeriod > 10) {
      throw new AppError('Period must be an integer between 1 and 10', 400);
    }

    if (startTime >= endTime) {
      throw new AppError('End time must be strictly after start time', 400);
    }

    // 2. CONFLICT CHECK 1: Faculty Double-Booking
    // A faculty member cannot teach two classes in the same academic year, day, and period
    const facultyConflict = await TimetableEntry.findOne({
      facultyId: mapping.facultyId._id,
      academicYearId: mapping.academicYearId._id,
      dayOfWeek,
      period: parsedPeriod,
      isActive: true,
    })
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .populate('subjectId', 'subjectCode subjectName');

    if (facultyConflict) {
      const facName = mapping.facultyId.name;
      const facId = mapping.facultyId.employeeId;
      const confClassName = facultyConflict.classId?.name || 'another class';
      const confSecName = facultyConflict.sectionId?.name || '';
      throw new AppError(
        `Faculty Double-Booking: ${facName} (${facId}) is already assigned to teach ${confClassName} - Sec ${confSecName} on ${dayOfWeek} during Period ${parsedPeriod}.`,
        409
      );
    }

    // 3. CONFLICT CHECK 2: Class/Section Timetable Conflict
    // A class/section cannot have two subjects in the same day and period
    const classConflict = await TimetableEntry.findOne({
      classId: mapping.classId._id,
      sectionId: mapping.sectionId._id,
      dayOfWeek,
      period: parsedPeriod,
      isActive: true,
    })
      .populate('subjectId', 'subjectCode subjectName');

    if (classConflict) {
      const clsName = mapping.classId.name;
      const secName = mapping.sectionId.name;
      const existingSubj = classConflict.subjectId?.subjectName || 'another subject';
      const existingCode = classConflict.subjectId?.subjectCode || '';
      throw new AppError(
        `Class Timetable Conflict: ${clsName} - Sec ${secName} already has ${existingSubj} (${existingCode}) scheduled on ${dayOfWeek} during Period ${parsedPeriod}.`,
        409
      );
    }

    // 4. CONFLICT CHECK 3: Room Conflict (if room is provided)
    if (room && room.trim()) {
      const roomConflict = await TimetableEntry.findOne({
        room: room.trim(),
        dayOfWeek,
        period: parsedPeriod,
        academicYearId: mapping.academicYearId._id,
        isActive: true,
      })
        .populate('classId', 'name')
        .populate('sectionId', 'name');

      if (roomConflict) {
        throw new AppError(
          `Room Conflict: Room '${room.trim()}' is already booked for ${roomConflict.classId?.name} - Sec ${roomConflict.sectionId?.name} on ${dayOfWeek} during Period ${parsedPeriod}.`,
          409
        );
      }
    }

    // 5. Create Timetable Entry with authentic relational hierarchy derived from mapping
    const entry = await TimetableEntry.create({
      academicYearId: mapping.academicYearId._id,
      departmentId: mapping.departmentId,
      classId: mapping.classId._id,
      sectionId: mapping.sectionId._id,
      subjectId: mapping.subjectId._id,
      facultyId: mapping.facultyId._id,
      facultyMappingId: mapping._id,
      dayOfWeek,
      period: parsedPeriod,
      startTime,
      endTime,
      room: room ? room.trim() : '',
      createdBy: userId,
      isActive: true,
    });

    return this.getById(entry._id);
  }

  async update(id, data) {
    const entry = await TimetableEntry.findById(id);
    if (!entry) {
      throw new AppError('Timetable Entry not found', 404);
    }

    const {
      dayOfWeek = entry.dayOfWeek,
      period = entry.period,
      startTime = entry.startTime,
      endTime = entry.endTime,
      room = entry.room,
      isActive = entry.isActive,
    } = data;

    const parsedPeriod = parseInt(period, 10);
    if (startTime >= endTime) {
      throw new AppError('End time must be strictly after start time', 400);
    }

    // Re-check faculty conflict
    const facultyConflict = await TimetableEntry.findOne({
      _id: { $ne: id },
      facultyId: entry.facultyId,
      academicYearId: entry.academicYearId,
      dayOfWeek,
      period: parsedPeriod,
      isActive: true,
    }).populate('classId', 'name').populate('sectionId', 'name');

    if (facultyConflict) {
      throw new AppError(
        `Faculty Double-Booking: Faculty is already assigned to teach in ${facultyConflict.classId?.name} - Sec ${facultyConflict.sectionId?.name} on ${dayOfWeek} during Period ${parsedPeriod}.`,
        409
      );
    }

    // Re-check class conflict
    const classConflict = await TimetableEntry.findOne({
      _id: { $ne: id },
      classId: entry.classId,
      sectionId: entry.sectionId,
      dayOfWeek,
      period: parsedPeriod,
      isActive: true,
    }).populate('subjectId', 'subjectCode subjectName');

    if (classConflict) {
      throw new AppError(
        `Class Timetable Conflict: This class section already has ${classConflict.subjectId?.subjectName} (${classConflict.subjectId?.subjectCode}) scheduled on ${dayOfWeek} during Period ${parsedPeriod}.`,
        409
      );
    }

    // Re-check room conflict
    if (room && room.trim()) {
      const roomConflict = await TimetableEntry.findOne({
        _id: { $ne: id },
        room: room.trim(),
        dayOfWeek,
        period: parsedPeriod,
        academicYearId: entry.academicYearId,
        isActive: true,
      });

      if (roomConflict) {
        throw new AppError(
          `Room Conflict: Room '${room.trim()}' is already booked on ${dayOfWeek} during Period ${parsedPeriod}.`,
          409
        );
      }
    }

    entry.dayOfWeek = dayOfWeek;
    entry.period = parsedPeriod;
    entry.startTime = startTime;
    entry.endTime = endTime;
    entry.room = room ? room.trim() : '';
    if (data.isActive !== undefined) entry.isActive = Boolean(isActive);

    await entry.save();
    return this.getById(entry._id);
  }

  async toggleStatus(id, isActive) {
    const entry = await TimetableEntry.findById(id);
    if (!entry) {
      throw new AppError('Timetable Entry not found', 404);
    }

    entry.isActive = isActive !== undefined ? Boolean(isActive) : !entry.isActive;
    await entry.save();
    return entry;
  }

  async delete(id) {
    const entry = await TimetableEntry.findById(id);
    if (!entry) {
      throw new AppError('Timetable Entry not found', 404);
    }

    await entry.deleteOne();
    return { id, message: 'Timetable entry deleted successfully' };
  }

  // Authenticated Faculty Weekly Timetable
  async getFacultyTimetableMe(userId, queryParams = {}) {
    const faculty = await Faculty.findOne({ userId });
    if (!faculty) {
      throw new AppError('No faculty profile linked to current account', 404);
    }

    const { day } = queryParams;
    const filter = {
      facultyId: faculty._id,
      isActive: true,
    };

    if (day) {
      filter.dayOfWeek = day;
    }

    const entries = await TimetableEntry.find(filter)
      .populate('subjectId', 'subjectCode subjectName subjectType credits')
      .populate('classId', 'name year semester programme')
      .populate('sectionId', 'name displayName capacity')
      .populate('departmentId', 'name code')
      .sort({ dayOfWeek: 1, period: 1 });

    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklySchedule = {};
    dayOrder.forEach((d) => {
      weeklySchedule[d] = entries.filter((e) => e.dayOfWeek === d);
    });

    return {
      faculty: {
        id: faculty._id,
        name: faculty.name,
        employeeId: faculty.employeeId,
      },
      weeklySchedule,
      totalWeeklyPeriods: entries.length,
    };
  }

  // Real data for Faculty Dashboard (Sections 26 & 32)
  async getFacultyDashboardSummary(userId) {
    const faculty = await Faculty.findOne({ userId })
      .populate('departmentId', 'name code');

    if (!faculty) {
      throw new AppError('No faculty profile linked to current account', 404);
    }

    // 1. Get active mappings
    const mappings = await FacultySubjectMapping.find({
      facultyId: faculty._id,
      isActive: true,
    })
      .populate('subjectId', 'subjectCode subjectName credits')
      .populate('classId', 'name year semester')
      .populate('sectionId', 'name displayName');

    const uniqueSubjects = new Set(mappings.map((m) => m.subjectId?._id?.toString() || m.subjectId?.toString()));
    const uniqueClasses = new Set(
      mappings.map((m) => `${m.classId?._id || m.classId}_${m.sectionId?._id || m.sectionId}`)
    );

    // 2. Get timetable entries
    const allTimetableEntries = await TimetableEntry.find({
      facultyId: faculty._id,
      isActive: true,
    })
      .populate('subjectId', 'subjectCode subjectName')
      .populate('classId', 'name')
      .populate('sectionId', 'name displayName')
      .sort({ period: 1 });

    // 3. Determine current day of week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayIndex = new Date().getDay();
    const todayName = dayNames[todayIndex];

    const todayClasses = allTimetableEntries.filter(
      (entry) => entry.dayOfWeek.toLowerCase() === todayName.toLowerCase()
    );

    return {
      faculty: {
        id: faculty._id,
        name: faculty.name,
        employeeId: faculty.employeeId,
        designation: faculty.designation,
        department: faculty.departmentId?.name,
        departmentCode: faculty.departmentId?.code,
      },
      assignedSubjectsCount: uniqueSubjects.size,
      assignedClassesCount: uniqueClasses.size,
      weeklyPeriodsCount: allTimetableEntries.length,
      currentDay: todayName,
      todayClasses: todayClasses.map((c) => ({
        id: c._id,
        period: c.period,
        startTime: c.startTime,
        endTime: c.endTime,
        subjectCode: c.subjectId?.subjectCode,
        subjectName: c.subjectId?.subjectName,
        className: c.classId?.name,
        sectionName: c.sectionId?.displayName || `Sec ${c.sectionId?.name}`,
        room: c.room || '—',
      })),
      mappings: mappings.map((m) => ({
        id: m._id,
        subjectCode: m.subjectId?.subjectCode,
        subjectName: m.subjectId?.subjectName,
        credits: m.subjectId?.credits,
        className: m.classId?.name,
        sectionName: m.sectionId?.displayName || `Sec ${m.sectionId?.name}`,
        year: m.classId?.year,
        semester: m.classId?.semester,
      })),
    };
  }
}

module.exports = new TimetableService();
