const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Section name is required (e.g. A, B)'],
      uppercase: true,
      trim: true,
      maxlength: [10, 'Section name cannot exceed 10 characters'],
    },
    code: {
      type: String,
      trim: true,
      default: '',
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class reference is required'],
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
    year: {
      type: Number,
      required: true,
    },
    semester: {
      type: Number,
      required: true,
    },
    capacity: {
      type: Number,
      default: 60,
      min: [1, 'Capacity must be at least 1 student'],
      max: [500, 'Capacity cannot exceed 500'],
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

// Section name must be unique within a specific class cohort
sectionSchema.index({ classId: 1, name: 1 }, { unique: true });

const Section = mongoose.model('Section', sectionSchema);

module.exports = Section;
