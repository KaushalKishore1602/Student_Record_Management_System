const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true
    },
    hod: {
      type: String,
      required: [true, 'HOD name is required']
    },
    building: {
      type: String,
      default: 'Main Academic Block'
    },
    establishedYear: {
      type: Number,
      default: 2005
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', DepartmentSchema);
