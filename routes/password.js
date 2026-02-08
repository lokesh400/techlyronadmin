const router = require("express").Router();
const crypto = require("crypto");
const User = require("../models/User");
const sendMail = require("../config/brevoMail");

/* =========================
   FORGOT PASSWORD PAGE
========================= */
router.get("/forgot-password", (req, res) => {
  res.render("auth/forgot-password");
});

/* =========================
   SEND RESET LINK
========================= */
router.post("/forgot-password", async (req, res) => {
  const { username } = req.body;

  try {
    const user = await User.findOne({ username:username });
    if (!user) {
      req.flash("error_msg", "No account with that username");
      return res.redirect("/forgot-password");
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 30; // 30 minutes
    await user.save();

    const resetLink = `${process.env.BASE_URL}/reset-password/${token}`;

    const html = `
      <p>Dear ${user.name || "User"},</p>

      <p>
        We received a request to reset your password for your
        Techlyron Tech Solutions account.
      </p>

      <p>
        Click the link below to reset your password:
      </p>

      <p>
        <a href="${resetLink}">${resetLink}</a>
      </p>

      <p>
        This link will expire in 30 minutes.
        If you did not request this, please ignore this email.
      </p>

      <p>
        Regards,<br>
        <strong>Techlyron Tech Solutions</strong>
      </p>
    `;

    await sendMail({
      to: user.email,
      subject: "Password Reset Request | Techlyron",
      html
    });

    req.flash("success_msg", "Password reset link sent to your email");
    res.redirect("/");

  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Something went wrong");
    res.redirect("/forgot-password");
  }
});

/* =========================
   RESET PASSWORD PAGE
========================= */
router.get("/reset-password/:token", async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash("error_msg", "Password reset link is invalid or expired");
    return res.redirect("/forgot-password");
  }

  res.render("auth/reset-password", { token: req.params.token });
});

/* =========================
   UPDATE PASSWORD
========================= */
router.post("/reset-password/:token", async (req, res) => {
  const { password, password2 } = req.body;

  if (password !== password2) {
    req.flash("error_msg", "Passwords do not match");
    return res.redirect("back");
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      req.flash("error_msg", "Token expired or invalid");
      return res.redirect("/forgot-password");
    }

    // passport-local-mongoose method
    await user.setPassword(password);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    req.flash("success_msg", "Password reset successful. Please login.");
    res.redirect("/");

  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Could not reset password");
    res.redirect("/forgot-password");
  }
});


module.exports = router;
