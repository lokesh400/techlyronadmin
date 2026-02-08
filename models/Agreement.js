const mongoose = require('mongoose');

const AgreementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  terms: { type: String },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByModel: { type: String, enum: ['User'], default: 'User' },
  signed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Agreement', AgreementSchema);
