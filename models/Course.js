const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true
    },
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: 1,
      max: 6
    },
    department: {
      type: String,
      required: [true, 'Department code is required'],
      uppercase: true
    },
    instructor: {
      type: String,
      default: 'Faculty Incharge'
    },
    maxCapacity: {
      type: Number,
      default: 60
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', CourseSchema);
