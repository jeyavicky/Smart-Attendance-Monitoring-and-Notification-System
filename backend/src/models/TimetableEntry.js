const mongoose = require('mongoose');

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const timetableEntrySchema = new mongoose.Schema(
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
    dayOfWeek: {
      type: String,
      required: [true, 'Day of week is required'],
      enum: {
        values: DAYS_OF_WEEK,
        message: '{VALUE} is not a valid timetable day',
      },
    },
    period: {
      type: Number,
      required: [true, 'Period number is required (1-10)'],
      min: [1, 'Period must be at least 1'],
      max: [10, 'Period cannot exceed 10'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required (e.g. 09:00)'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid start time format (HH:MM)'],
      default: '09:00',
    },
    endTime: {
      type: String,
      required: [true, 'End time is required (e.g. 09:50)'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid end time format (HH:MM)'],
      default: '09:50',
    },
    room: {
      type: String,
      trim: true,
      default: '',
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

// Indexes supporting timetable conflict prevention and rapid query lookups
timetableEntrySchema.index(
  { facultyId: 1, academicYearId: 1, dayOfWeek: 1, period: 1, isActive: 1 },
  { name: 'idx_faculty_conflict' }
);

timetableEntrySchema.index(
  { classId: 1, sectionId: 1, dayOfWeek: 1, period: 1, isActive: 1 },
  { name: 'idx_class_conflict' }
);

timetableEntrySchema.index(
  { facultyMappingId: 1, isActive: 1 },
  { name: 'idx_mapping_timetable' }
);

timetableEntrySchema.index(
  { dayOfWeek: 1, period: 1, room: 1, isActive: 1 },
  { name: 'idx_room_conflict' }
);

const TimetableEntry = mongoose.model('TimetableEntry', timetableEntrySchema);

TimetableEntry.DAYS_OF_WEEK = DAYS_OF_WEEK;

module.exports = TimetableEntry;
