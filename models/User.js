const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String },
  role: { type: String, enum: ['Admin', 'Worker'], default: 'Worker' },
  createdAt: { type: Date, default: Date.now },
  resetPasswordToken: String,
  resetPasswordExpires: Date
},
 { timestamps: true });

userSchema.plugin(passportLocalMongoose, {
  usernameField: "username",
  errorMessages: {
    UserExistsError: "A user with the given username is already registered"
  }
});

module.exports = mongoose.model("User", userSchema);
