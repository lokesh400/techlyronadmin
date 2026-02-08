const express = require('express');
const router = express.Router();
const Agreement = require('../../models/Agreement');
const Lead = require('../../models/Lead');
const { ensureAdmin } = require('./utils');

router.use(ensureAdmin);

// Agreements (admin)
router.get('/', async (req, res) => {
  try {
    const agreements = await Agreement.find()
      .populate('lead')
      .sort({ createdAt: -1 });
    res.render('admin/agreements_admin', { admin: req.user, agreements });
  } catch (err) {
    req.flash('error_msg', 'Error fetching agreements');
    res.redirect('/admin/dashboard');
  }
});

router.get('/create/:leadId?', async (req, res) => {
  const lead = req.params.leadId ? await Lead.findById(req.params.leadId) : null;
  res.render('admin/agreement_form', {
    admin: req.user,
    formTitle: 'Create Agreement',
    action: '/admin/agreements/create',
    agreement: null,
    lead,
    errors: []
  });
});

router.post('/create', async (req, res) => {
  const { title, terms, lead } = req.body;
  let errors = [];
  if (!title) errors.push({ msg: 'Title required' });
  if (errors.length)
    return res.render('admin/agreement_form', {
      admin: req.user,
      formTitle: 'Create Agreement',
      action: '/admin/agreements/create',
      agreement: req.body,
      lead: lead ? await Lead.findById(lead) : null,
      errors
    });
  try {
    const a = new Agreement({
      title,
      terms,
      lead,
      createdBy: req.user._id,
      createdByModel: 'User'
    });
    await a.save();
    req.flash('success_msg', 'Agreement created');
    res.redirect('/admin/agreements');
  } catch (err) {
    req.flash('error_msg', 'Error creating agreement');
    res.redirect('/admin/agreements');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const agreement = await Agreement.findById(req.params.id).populate('lead');
    res.render('admin/agreement_view', { admin: req.user, agreement });
  } catch (err) {
    req.flash('error_msg', 'Error loading agreement');
    res.redirect('/admin/agreements');
  }
});

module.exports = router;
