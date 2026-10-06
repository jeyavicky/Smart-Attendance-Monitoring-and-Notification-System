const mongoose = require('mongoose');

const facultySubjectMappingSchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: [true, 'Faculty reference is required'],
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: [true, 'Academic Year reference is required'],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class cohort reference is required'],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section reference is required'],
    },
    year: {
      type: Number,
      required: [true, 'Study year is required (1-4)'],
      min: 1,
      max: 4,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required (1-8)'],
      min: 1,
      max: 8,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index to prevent duplicate assignment of the same faculty to the same subject & section
facultySubjectMappingSchema.index(
  { facultyId: 1, subjectId: 1, classId: 1, sectionId: 1, academicYearId: 1 },
  { unique: true }
);

// Fast lookups for faculty personal mappings and class-section schedules
facultySubjectMappingSchema.index({ facultyId: 1, isActive: 1 });
facultySubjectMappingSchema.index({ classId: 1, sectionId: 1, isActive: 1 });
facultySubjectMappingSchema.index({ departmentId: 1, academicYearId: 1 });

const FacultySubjectMapping = mongoose.model(
  'FacultySubjectMapping',
  facultySubjectMappingSchema
);

module.exports = FacultySubjectMapping;
