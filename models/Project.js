const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  amount: Number,
  mode: {
    type: String,
    enum: ["UPI", "Cash", "Bank", "Card"]
  },
  paidOn: {
    type: Date,
    default: Date.now
  },
  note: String
});

const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true
  },

  clientName: {
    type: String,
    required: true
  },

  mobile: {
    type: String,
    required: true
  },

  businessName: String,

  services: [{
    type: String
  }],

  totalAmount: {
    type: Number,
    required: true
  },

  payments: [paymentSchema],

  totalPaid: {
    type: Number,
    default: 0
  },

  projectCreatedDate: {
    type: Date,
    default: Date.now
  },

  liveDate: Date,

  dueDate: Date,

  status: {
    type: String,
    enum: ["Pending", "Live", "Expired"],
    default: "Pending"
  }

}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);
