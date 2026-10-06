const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Department code is required (e.g. IT, CSE)'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, 'Department code must be at least 2 characters'],
      maxlength: [10, 'Department code cannot exceed 10 characters'],
    },
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Department name must be at least 3 characters'],
      maxlength: [150, 'Department name cannot exceed 150 characters'],
    },
    shortName: {
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

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
