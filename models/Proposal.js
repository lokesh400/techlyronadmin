const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema({
  accepted: { type: Boolean, default: false },
  status: { type: String, default: 'pending' },
  responseToken: { type: String },
  respondedAt: { type: Date },
  acceptedAt: { type: Date },
  rejectedAt: { type: Date },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sentAt: { type: Date },
  sentToEmail: { type: String },
  sent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Proposal', ProposalSchema);
