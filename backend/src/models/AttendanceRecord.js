const mongoose = require('mongoose');
const { ATTENDANCE_STATUS } = require('../config/constants');

const ALLOWED_STATUSES = Object.values(ATTENDANCE_STATUS);

const attendanceRecordSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      required: [true, 'Attendance Session reference is required'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    status: {
      type: String,
      required: [true, 'Attendance status is required'],
      enum: {
        values: ALLOWED_STATUSES,
        message: 'Invalid attendance status {VALUE}. Allowed: P, A, OD, ML',
      },
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

// Compound unique index ensuring each student has exactly one record per attendance session
attendanceRecordSchema.index(
  { sessionId: 1, studentId: 1 },
  { unique: true, name: 'idx_session_student_unique' }
);

// Fast aggregation indexes
attendanceRecordSchema.index({ studentId: 1, status: 1 });
attendanceRecordSchema.index({ sessionId: 1, status: 1 });

const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);

AttendanceRecord.ALLOWED_STATUSES = ALLOWED_STATUSES;

module.exports = AttendanceRecord;
