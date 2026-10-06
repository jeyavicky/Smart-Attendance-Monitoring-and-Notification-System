const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class display name is required'],
      trim: true,
    },
    programme: {
      type: String,
      required: [true, 'Programme is required (e.g. B.Tech)'],
      trim: true,
      default: 'B.Tech',
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: [true, 'Academic Year is required'],
    },
    year: {
      type: Number,
      required: [true, 'Study year is required (1-4)'],
      min: [1, 'Study year must be at least 1'],
      max: [4, 'Study year cannot exceed 4'],
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required (1-8)'],
      min: [1, 'Semester must be at least 1'],
      max: [8, 'Semester cannot exceed 8'],
      validate: {
        validator: function (sem) {
          const expectedMin = (this.year - 1) * 2 + 1;
          const expectedMax = this.year * 2;
          return sem >= expectedMin && sem <= expectedMax;
        },
        message: 'Invalid semester for the specified study year. Year {VALUE} must correspond to logical semesters.',
      },
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

// Compound unique index ensuring no duplicate cohort class definitions in same academic year
classSchema.index(
  { departmentId: 1, academicYearId: 1, programme: 1, year: 1, semester: 1 },
  { unique: true }
);

const Class = mongoose.model('Class', classSchema);

module.exports = Class;
