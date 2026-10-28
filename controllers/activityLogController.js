const ActivityLog = require('../models/ActivityLog');

/**
 * @desc    Get recent activity logs
 * @route   GET /api/logs
 */
exports.getRecentLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
