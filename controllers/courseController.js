const Department = require('../models/Department');
const Course = require('../models/Course');

/**
 * @desc    Get all departments
 * @route   GET /api/departments
 */
exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ code: 1 });
    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create new department
 * @route   POST /api/departments
 */
exports.createDepartment = async (req, res) => {
  try {
    const dept = new Department(req.body);
    await dept.save();
    res.status(201).json({ success: true, data: dept });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all courses
 * @route   GET /api/courses
 */
exports.getAllCourses = async (req, res) => {
  try {
    const { department } = req.query;
    const filter = department ? { department: department.toUpperCase() } : {};
    const courses = await Course.find(filter).sort({ courseCode: 1 });
    res.json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create new course
 * @route   POST /api/courses
 */
exports.createCourse = async (req, res) => {
  try {
    const course = new Course(req.body);
    await course.save();
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
