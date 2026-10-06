const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Class = require('../models/Class');
const Section = require('../models/Section');
const { Subject } = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');

class DashboardService {
  async getAdminSummary() {
    const [
      totalStudents,
      activeStudents,
      totalFaculty,
      activeFaculty,
      totalDepartments,
      activeDepartments,
      totalClasses,
      activeClasses,
      totalSections,
      totalSubjects,
      currentAcademicYear,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ isActive: true }),
      Faculty.countDocuments(),
      Faculty.countDocuments({ isActive: true }),
      Department.countDocuments(),
      Department.countDocuments({ isActive: true }),
      Class.countDocuments(),
      Class.countDocuments({ isActive: true }),
      Section.countDocuments(),
      Subject.countDocuments(),
      AcademicYear.findOne({ isCurrent: true }).select('name startDate endDate'),
    ]);

    return {
      students: totalStudents,
      activeStudents,
      faculty: totalFaculty,
      activeFaculty,
      departments: totalDepartments,
      activeDepartments,
      classes: totalClasses,
      activeClasses,
      sections: totalSections,
      subjects: totalSubjects,
      currentAcademicYear: currentAcademicYear ? currentAcademicYear.name : 'Not Designated',
      currentAcademicYearDetails: currentAcademicYear,
    };
  }

  async getFacultyProfile(userId) {
    const faculty = await Faculty.findOne({ userId })
      .populate('departmentId', 'code name shortName')
      .populate('userId', 'name email role isActive lastLogin');

    return faculty;
  }

  async getStudentProfile(userId) {
    const student = await Student.findOne({ userId })
      .populate('departmentId', 'code name shortName')
      .populate('academicYearId', 'name isCurrent')
      .populate('classId', 'name programme year semester')
      .populate('sectionId', 'name code capacity')
      .populate('userId', 'name email role isActive lastLogin');

    return student;
  }
}

module.exports = new DashboardService();
