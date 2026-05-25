const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    // e.g. 'task_created', 'task_updated', 'member_added', 'task_deleted'
  },
  details: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // Flexible metadata
  }
}, { timestamps: true });

activityLogSchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
