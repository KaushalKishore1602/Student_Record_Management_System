const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ['CREATE_STUDENT', 'UPDATE_STUDENT', 'DELETE_STUDENT', 'BATCH_UPLOAD', 'LOGIN', 'LOGOUT', 'EXPORT_DATA']
    },
    performedBy: {
      type: String,
      default: 'System User'
    },
    role: {
      type: String,
      default: 'Admin'
    },
    targetRegNo: {
      type: String,
      default: 'N/A'
    },
    details: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
