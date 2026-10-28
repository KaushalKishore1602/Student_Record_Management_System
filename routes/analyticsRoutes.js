const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

router.get('/dashboard-stats', analyticsController.getDashboardStats);
router.get('/department-summary', analyticsController.getDepartmentSummary);
router.get('/semester-distribution', analyticsController.getSemesterDistribution);
router.get('/grade-distribution', analyticsController.getGradeDistribution);
router.get('/top-performers', analyticsController.getTopPerformers);
router.post('/query-playground', analyticsController.runQueryPlayground);

module.exports = router;
