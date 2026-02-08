const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../../models/User');
const {
  ensureAdmin,
  normalizeUsername,
  isGmailAddress
} = require('./utils');

// Login POST
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      req.flash("error_msg", "Invalid credentials");
      return res.redirect("/login");
    }

    req.logIn(user, err => {
      if (err) return next(err);

      // 🔐 ROLE-BASED REDIRECT
      if (user.role === "Admin") {
        return res.redirect("/admin/dashboard");
      }

      if (user.role === "Worker") {
        return res.redirect("/worker/dashboard");
      }

      // fallback
      res.redirect("/");
    });
  })(req, res, next);
});


// Dashboard
router.get('/dashboard', ensureAdmin, (req, res) => {
  res.render('admin/dashboard', { admin: req.user });
});

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    req.flash('success_msg', 'You are logged out');
    res.redirect('/');
  });
});

// Admin registration (allow open registration only when no admin exists)
router.get('/register', async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'Admin' });
    if (adminCount === 0) {
      return res.render('admin/register', {
        errors: [],
        name: '',
        username: '',
        email: '',
        role: 'Admin'
      });
    }
    // if admins exist, require admin access to register
    if (req.isAuthenticated() && req.user && req.user.role === 'Admin') {
      return res.render('admin/register', {
        errors: [],
        name: '',
        username: '',
        email: '',
        role: 'Admin'
      });
    }
    req.flash('error_msg', 'Registration closed');
    return res.redirect('/');
  } catch (err) {
    req.flash('error_msg', 'Error checking registration availability');
    return res.redirect('/');
  }
});

router.post('/register', async (req, res) => {
  const { name, username, email, role, password, password2 } = req.body;
  console.log(req.body);
  let errors = [];

  if (!name || !username || !email || !password || !password2) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (password !== password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (!isGmailAddress(email)) {
    errors.push({ msg: 'Email must be a Gmail address' });
  }

  const normalizedUsername = normalizeUsername(username);

  if (errors.length > 0) {
    return res.render('admin/register', {
      errors,
      name,
      username: normalizedUsername,
      email,
      role
    });
  }

  try {
    const adminCount = await User.countDocuments({ role: 'Admin' });

    if (adminCount > 0) {
      if (!(req.isAuthenticated() && req.user?.role === 'Admin')) {
        req.flash('error_msg', 'Only an admin can register new users');
        return res.redirect('/');
      }
    }

    const userExists = await User.findOne({
      $or: [{ username: normalizedUsername }, { email }]
    });

    if (userExists) {
      errors.push({ msg: 'Username or Email already exists' });
      return res.render('admin/register', {
        errors,
        name,
        username: normalizedUsername,
        email,
        role
      });
    }

    // DO NOT include password here
    const newUser = new User({
      name,
      username: normalizedUsername,
      email,
      role: role || 'Worker'
    });

    // Hashes + salts password
    await User.register(newUser, req.body.password);

    req.flash('success_msg', 'User registered successfully');
    res.redirect('/');
  } catch (err) {
    console.error(err);
    errors.push({ msg: 'Error registering user' });
    res.render('admin/register', {
      errors,
      name,
      username: normalizedUsername,
      email,
      role
    });
  }
});

module.exports = router;
