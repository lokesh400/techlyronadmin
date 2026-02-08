const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String },
  email: { type: String },
  status: { type: String, default: 'new' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  businessName: { type: String },
  services: [{ type: String }],
  notes: { type: String },
  lastFollowupAt: { type: Date },
  lastFollowupNote: { type: String },
  createdAt: { type: Date, default: Date.now },
  editAllowed: { type: Boolean, default: true }
});

module.exports = mongoose.model('Lead', LeadSchema);
