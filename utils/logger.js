const ActivityLog = require('../models/ActivityLog');

/**
 * Log user activity into MongoDB collection
 */
const logActivity = async ({ action, performedBy = 'Admin User', role = 'Admin', targetRegNo = 'N/A', details }) => {
  try {
    const log = new ActivityLog({
      action,
      performedBy,
      role,
      targetRegNo,
      details,
      timestamp: new Date()
    });
    await log.save();
  } catch (err) {
    console.error('[ActivityLog Error]:', err.message);
  }
};

module.exports = logActivity;
