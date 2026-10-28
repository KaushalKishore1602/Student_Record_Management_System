const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');

router.get('/', activityLogController.getRecentLogs);

module.exports = router;
