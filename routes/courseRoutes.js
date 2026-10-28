const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

router.route('/departments')
  .get(courseController.getAllDepartments)
  .post(courseController.createDepartment);

router.route('/courses')
  .get(courseController.getAllCourses)
  .post(courseController.createCourse);

module.exports = router;
