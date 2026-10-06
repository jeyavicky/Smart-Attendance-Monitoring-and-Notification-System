const mongoose = require('mongoose');

const SUBJECT_TYPES = [
  'Core',
  'Professional Elective',
  'Open Elective',
  'Honours',
  'Minor',
  'Laboratory',
  'Other',
];

const subjectSchema = new mongoose.Schema(
  {
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required (e.g. IT3501)'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, 'Subject code must be at least 3 characters'],
      maxlength: [15, 'Subject code cannot exceed 15 characters'],
    },
    subjectName: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      minlength: [3, 'Subject name must be at least 3 characters'],
      maxlength: [150, 'Subject name cannot exceed 150 characters'],
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
        message: 'Invalid semester for the specified study year.',
      },
    },
    subjectType: {
      type: String,
      enum: {
        values: SUBJECT_TYPES,
        message: '{VALUE} is not a valid subject type',
      },
      default: 'Core',
    },
    credits: {
      type: Number,
      required: [true, 'Subject credits are required'],
      min: [1, 'Credits must be at least 1'],
      max: [10, 'Credits cannot exceed 10'],
      default: 3,
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

const Subject = mongoose.model('Subject', subjectSchema);

Subject.Subject = Subject;
Subject.SUBJECT_TYPES = SUBJECT_TYPES;

module.exports = Subject;

