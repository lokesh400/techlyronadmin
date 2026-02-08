const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const {
  ensureAdmin,
  normalizeUsername,
  isGmailAddress
} = require('./utils');
const sendMail = require('../../config/brevoMail');

router.use(ensureAdmin);

// List users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.render('admin/users', { admin: req.user, users });
  } catch (err) {
    req.flash('error_msg', 'Error fetching users');
    res.redirect('/admin/dashboard');
  }
});

// Create user form
router.get('/create', (req, res) => {
  res.render('admin/user_form', {
    admin: req.user,
    formTitle: 'Create User',
    action: '/admin/users/create',
    user: null,
    errors: []
  });
});

// Create user POST
router.post('/create', async (req, res) => {
  const { name, username, email, role, password, password2 } = req.body;
  const errors = [];

  const normalizedUsername = normalizeUsername(username);

  // VALIDATION
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

  if (errors.length > 0) {
    return res.render('admin/user_form', {
      admin: req.user,
      formTitle: 'Create User',
      action: '/admin/users/create',
      user: { ...req.body, username: normalizedUsername },
      errors
    });
  }

  try {
    // CHECK USERNAME OR EMAIL
    const existingUser = await User.findOne({
      $or: [
        { username: normalizedUsername },
        { email }
      ]
    });

    if (existingUser) {
      errors.push({ msg: 'Username or Email already exists' });
      return res.render('admin/user_form', {
        admin: req.user,
        formTitle: 'Create User',
        action: '/admin/users/create',
        user: { ...req.body, username: normalizedUsername },
        errors
      });
    }

    // CREATE USER (NO PASSWORD FIELD)
    const newUser = new User({
      name,
      username: normalizedUsername,
      email,
      role: role || 'Worker'
    });

    // ✅ PASSPORT-LOCAL-MONGOOSE WAY
    await User.register(newUser, password);

    // SEND WELCOME EMAIL (NO PASSWORD)
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color:#111">
        <h2>Welcome to Techlyron</h2>
        <p>Hello ${name},</p>

        <p>
          Your account has been successfully created with
          <strong>Techlyron Tech Solutions</strong>.
        </p>

        <strong>Please reset your password first by clicking the link below:</strong>

        <p>
          <strong>Username:</strong> ${normalizedUsername}<br>
          <strong>Email:</strong> ${email}
        </p>

        <p>
          You may log in using the link below.
        </p>

        <p>
          <a href="${process.env.BASE_URL}/l"
             style="padding:10px 16px;background:#000;color:#fff;text-decoration:none;border-radius:4px;">
            Login to Techlyron
          </a>
        </p>

        <p style="margin-top:20px;">
          Regards,<br>
          <strong>Techlyron Tech Solutions</strong>
        </p>
      </div>
    `;

    await sendMail({
      to: email,
      subject: 'Welcome to Techlyron',
      html: htmlContent
    });

    req.flash('success_msg', 'User created successfully');
    res.redirect('/admin/users');

  } catch (err) {
    console.error(err);

    // HANDLE DUPLICATE KEY ERROR (SAFETY)
    if (err.code === 11000) {
        console.log(err)
      errors.push({ msg: 'Username or Email already exists' });
    } else {
      errors.push({ msg: 'Error creating user' });
    }

    res.render('admin/user_form', {
      admin: req.user,
      formTitle: 'Create User',
      action: '/admin/users/create',
      user: req.body,
      errors
    });
  }
});


// Edit user form
router.get('/edit/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/admin/users');
    }
    res.render('admin/user_form', {
      admin: req.user,
      formTitle: 'Edit User',
      action: `/admin/users/edit/${user._id}`,
      user,
      errors: []
    });
  } catch (err) {
    req.flash('error_msg', 'Error loading user');
    res.redirect('/admin/users');
  }
});

// Edit user POST
router.post('/edit/:id', async (req, res) => {
  const { name, username, email, role, password, password2 } = req.body;
  let errors = [];
  if (!name || !username || !email) {
    errors.push({ msg: 'Please enter name, username, and email' });
  }
  if (password || password2) {
    if (password !== password2) {
      errors.push({ msg: 'Passwords do not match' });
    }
    if (password && password.length < 6) {
      errors.push({ msg: 'Password must be at least 6 characters' });
    }
  }
  if (!isGmailAddress(email)) {
    errors.push({ msg: 'Email must be a Gmail address' });
  }
  const normalizedUsername = normalizeUsername(username);
  if (errors.length > 0) {
    return res.render('user_form', {
      admin: req.user,
      formTitle: 'Edit User',
      action: `/admin/users/edit/${req.params.id}`,
      user: {
        _id: req.params.id,
        name,
        username: normalizedUsername,
        email,
        role
      },
      errors
    });
  }
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/admin/users');
    }
    const usernameTaken = await User.findOne({
      username: normalizedUsername,
      _id: { $ne: user._id }
    });
    if (usernameTaken) {
      errors.push({ msg: 'Username already in use' });
      return res.render('admin/user_form', {
        admin: req.user,
        formTitle: 'Edit User',
        action: `/admin/users/edit/${req.params.id}`,
        user: {
          _id: req.params.id,
          name,
          username: normalizedUsername,
          email,
          role
        },
        errors
      });
    }
    const emailTaken = await User.findOne({ email, _id: { $ne: user._id } });
    if (emailTaken) {
      errors.push({ msg: 'Email already in use' });
      return res.render('admin/user_form', {
        admin: req.user,
        formTitle: 'Edit User',
        action: `/admin/users/edit/${req.params.id}`,
        user: {
          _id: req.params.id,
          name,
          username: normalizedUsername,
          email,
          role
        },
        errors
      });
    }
    user.name = name;
    user.username = normalizedUsername;
    user.email = email;
    user.role = role || user.role;
    if (password) user.password = password;
    await user.save();
    req.flash('success_msg', 'User updated');
    res.redirect('/admin/users');
  } catch (err) {
    errors.push({ msg: 'Error updating user' });
    res.render('admin/user_form', {
      admin: req.user,
      formTitle: 'Edit User',
      action: `/admin/users/edit/${req.params.id}`,
      user: {
        _id: req.params.id,
        name,
        username: normalizedUsername,
        email,
        role
      },
      errors
    });
  }
});

// Delete user
router.post('/delete/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'User deleted');
  } catch (err) {
    req.flash('error_msg', 'Error deleting user');
  }
  res.redirect('/admin/users');
});

module.exports = router;
