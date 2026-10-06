const mongoose = require('mongoose');
const { SESSION_STATUS } = require('../config/constants');

const attendanceSessionSchema = new mongoose.Schema(
  {
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: [true, 'Academic Year reference is required'],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
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
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: [true, 'Faculty reference is required'],
    },
    facultyMappingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FacultySubjectMapping',
      required: [true, 'Faculty Mapping reference is required'],
    },
    timetableEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimetableEntry',
      default: null,
    },
    attendanceDate: {
      type: Date,
      required: [true, 'Attendance date is required'],
    },
    dayOfWeek: {
      type: String,
      required: [true, 'Day of week is required'],
      enum: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
    },
    period: {
      type: Number,
      required: [true, 'Period number is required (1-10)'],
      min: [1, 'Period must be at least 1'],
      max: [10, 'Period cannot exceed 10'],
    },
    sessionStatus: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.SUBMITTED,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User who marked attendance is required'],
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastUpdatedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Compound unique index preventing duplicate attendance sessions for the same class cohort, section, subject, date, and period
attendanceSessionSchema.index(
  {
    classId: 1,
    sectionId: 1,
    subjectId: 1,
    attendanceDate: 1,
    period: 1,
  },
  {
    unique: true,
    name: 'idx_session_unique_slot',
  }
);

// Indexes supporting efficient query filters
attendanceSessionSchema.index({ facultyId: 1, attendanceDate: 1 });
attendanceSessionSchema.index({ classId: 1, sectionId: 1, attendanceDate: 1 });
attendanceSessionSchema.index({ subjectId: 1, attendanceDate: 1 });
attendanceSessionSchema.index({ attendanceDate: 1, period: 1 });

const AttendanceSession = mongoose.model('AttendanceSession', attendanceSessionSchema);

module.exports = AttendanceSession;
