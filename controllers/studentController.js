const Student = require('../models/Student');
const Department = require('../models/Department');
const logActivity = require('../utils/logger');

/**
 * @desc    Get all students with search, filter, pagination, and sorting
 * @route   GET /api/students
 */
exports.getAllStudents = async (req, res) => {
  try {
    const {
      q,
      department,
      semester,
      feeStatus,
      status,
      defaulter,
      minCgpa,
      maxCgpa,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const filter = {};

    // Text search or regex matching
    if (q && q.trim() !== '') {
      const searchRegex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { regNo: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { 'address.city': searchRegex }
      ];
    }

    // Direct filter matchers
    if (department && department !== 'ALL') {
      filter.department = department.toUpperCase();
    }

    if (semester && semester !== 'ALL') {
      filter.semester = parseInt(semester, 10);
    }

    if (feeStatus && feeStatus !== 'ALL') {
      filter.feeStatus = feeStatus;
    }

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    // Attendance Defaulter Filter (< 75%)
    if (defaulter === 'true') {
      filter.attendance = { $lt: 75 };
    }

    if (minCgpa || maxCgpa) {
      filter.cgpa = {};
      if (minCgpa) filter.cgpa.$gte = parseFloat(minCgpa);
      if (maxCgpa) filter.cgpa.$lte = parseFloat(maxCgpa);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const [students, total] = await Promise.all([
      Student.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('enrolledCourses', 'courseCode title credits instructor'),
      Student.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: students,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('Error in getAllStudents:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get single student by ID or regNo
 * @route   GET /api/students/:id
 */
exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    let student;

    // Check if ID is a valid Mongo ObjectId or registration number
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      student = await Student.findById(id).populate('enrolledCourses');
    } else {
      student = await Student.findOne({ regNo: id.toUpperCase() }).populate('enrolledCourses');
    }

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Error in getStudentById:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create new student record
 * @route   POST /api/students
 */
exports.createStudent = async (req, res) => {
  try {
    const studentData = req.body;

    // Normalize regNo and email
    if (studentData.regNo) studentData.regNo = studentData.regNo.trim().toUpperCase();
    if (studentData.email) studentData.email = studentData.email.trim().toLowerCase();
    if (studentData.department) studentData.department = studentData.department.trim().toUpperCase();

    // Check for existing regNo or email
    const existing = await Student.findOne({
      $or: [{ regNo: studentData.regNo }, { email: studentData.email }]
    });

    if (existing) {
      const duplicateField = existing.regNo === studentData.regNo ? 'Registration Number' : 'Email Address';
      return res.status(400).json({
        success: false,
        message: `${duplicateField} already exists in the system!`
      });
    }

    const newStudent = new Student(studentData);
    await newStudent.save();

    await logActivity({
      action: 'CREATE_STUDENT',
      performedBy: req.user ? req.user.name : 'Faculty / Staff',
      role: req.user ? req.user.role : 'Admin',
      targetRegNo: newStudent.regNo,
      details: `Created new student record for ${newStudent.firstName} ${newStudent.lastName} (${newStudent.department})`
    });

    res.status(201).json({
      success: true,
      message: 'Student record created successfully',
      data: newStudent
    });
  } catch (error) {
    console.error('Error in createStudent:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate key error: RegNo or Email already exists.'
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update student record
 * @route   PUT /api/students/:id
 */
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.regNo) updateData.regNo = updateData.regNo.trim().toUpperCase();
    if (updateData.email) updateData.email = updateData.email.trim().toLowerCase();
    if (updateData.department) updateData.department = updateData.department.trim().toUpperCase();

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }

    // Merge updates
    Object.assign(student, updateData);
    await student.save();

    await logActivity({
      action: 'UPDATE_STUDENT',
      performedBy: req.user ? req.user.name : 'Faculty / Staff',
      role: req.user ? req.user.role : 'Admin',
      targetRegNo: student.regNo,
      details: `Updated details/marks for ${student.firstName} ${student.lastName} (${student.regNo})`
    });

    res.json({
      success: true,
      message: 'Student record updated successfully',
      data: student
    });
  } catch (error) {
    console.error('Error in updateStudent:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate key error: RegNo or Email already belongs to another student.'
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete student record
 * @route   DELETE /api/students/:id
 */
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStudent = await Student.findByIdAndDelete(id);

    if (!deletedStudent) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }

    await logActivity({
      action: 'DELETE_STUDENT',
      performedBy: req.user ? req.user.name : 'Administrator',
      role: req.user ? req.user.role : 'Admin',
      targetRegNo: deletedStudent.regNo,
      details: `Permanently removed student record [${deletedStudent.regNo}]`
    });

    res.json({
      success: true,
      message: `Student record [${deletedStudent.regNo}] deleted successfully`
    });
  } catch (error) {
    console.error('Error in deleteStudent:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Export all or filtered student records as JSON
 * @route   GET /api/students/export/json
 */
exports.exportStudentsJson = async (req, res) => {
  try {
    const students = await Student.find().populate('enrolledCourses', 'courseCode title credits');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=students_records.json');
    res.json(students);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
