const mongoose = require('mongoose');

const FollowupSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  note: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  nextFollowUp: { type: Date }
});

module.exports = mongoose.model('Followup', FollowupSchema);
