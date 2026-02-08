const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Lead = require('../../models/Lead');
const Followup = require('../../models/Followup');
const Proposal = require('../../models/Proposal');
const Agreement = require('../../models/Agreement');
const { ensureAdmin } = require('./utils');

function parseServices(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(item => item.trim()).filter(Boolean);
  }
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

// router.use(ensureAdmin);

// Admin leads: list all leads
router.get('/', async (req, res) => {
  try {
    const leads = await Lead.find().populate('assignedTo createdBy name').sort({ createdAt: -1 });
    const workers = await User.find({ role: 'Worker' });
    res.render('leads/allLeads', { admin: req.user, leads, workers });
  } catch (err) {
    req.flash('error_msg', 'Error fetching leads');
    res.redirect('/admin/dashboard');
  }
});

// Admin create lead
router.get('/create', async (req, res) => {
  const workers = await User.find({ role: 'Worker' });
  res.render('leads/newLead', {
    admin: req.user,
    formTitle: 'Create Lead',
    action: '/admin/leads/create',
    lead: null,
    workers,
    errors: []
  });
});

router.post('/create', async (req, res) => {
  const {
    name,
    contact,
    email,
    services,
    businessName,
    status,
    notes,
    assignedTo,
    editAllowed
  } = req.body;
  let errors = [];
  if (!name) errors.push({ msg: 'Name is required' });
  if (errors.length) {
    const workers = await User.find({ role: 'Worker' });
    return res.render('leads/newLead', {
      admin: req.user,
      formTitle: 'Create Lead',
      action: '/admin/leads/create',
      lead: req.body,
      workers,
      errors
    });
  }
  try {
    const lead = new Lead({
      name,
      contact,
      email,
      status: status || 'new',
      assignedTo: assignedTo || undefined,
      createdBy: req.user._id,
      businessName,
      services: parseServices(services),
      notes,
      editAllowed: editAllowed === 'on'
    });
    await lead.save();
    req.flash('success_msg', 'Lead created');
    res.redirect('/admin/leads');
  } catch (err) {
    req.flash('error_msg', 'Error creating lead');
    res.redirect('/admin/leads');
  }
});

// Admin edit lead
router.get('/:id/edit', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('assignedTo','createdBy');
    if (!lead) {
      req.flash('error_msg', 'Lead not found');
      return res.redirect('/admin/leads');
    }
    if (!lead.editAllowed) {
      req.flash('error_msg', 'Editing is disabled for this lead');
      return res.redirect(`/admin/leads/${lead._id}`);
    }
    const workers = await User.find({ role: 'Worker' });
    res.render('leads/newLead', {
      admin: req.user,
      formTitle: 'Edit Lead',
      action: `/admin/leads/${lead._id}/edit`,
      lead,
      workers,
      errors: []
    });
  } catch (err) {
    req.flash('error_msg', 'Error loading lead');
    res.redirect('/admin/leads');
  }
});

router.post('/:id/edit', async (req, res) => {
  const {
    name,
    contact,
    email,
    services,
    businessName,
    status,
    notes,
    assignedTo,
  } = req.body;
  let errors = [];
  if (!name) errors.push({ msg: 'Name is required' });
  if (errors.length) {
    const workers = await User.find({ role: 'Worker' });
    return res.render('leads/newLead', {
      admin: req.user,
      formTitle: 'Edit Lead',
      action: `/admin/leads/${req.params.id}/edit`,
      lead: { ...req.body, _id: req.params.id },
      workers,
      errors
    });
  }
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      req.flash('error_msg', 'Lead not found');
      return res.redirect('/admin/leads');
    }
    if (!lead.editAllowed) {
      req.flash('error_msg', 'Editing is disabled for this lead');
      return res.redirect(`/admin/leads/${lead._id}`);
    }
    lead.name = name;
    lead.contact = contact;
    lead.email = email;
    lead.status = status || lead.status;
    lead.assignedTo = assignedTo || undefined;
    lead.businessName = businessName;
    lead.services = parseServices(services);
    lead.notes = notes;
    lead.editAllowed = editAllowed === 'on';
    await lead.save();
    req.flash('success_msg', 'Lead updated');
    res.redirect(`/admin/leads/${lead._id}`);
  } catch (err) {
    req.flash('error_msg', 'Error updating lead');
    res.redirect('/admin/leads');
  }
});

// Admin view lead details and followups
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('assignedTo');
    let followups = await Followup.find({ lead: lead._id })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');
    followups = followups.map(f => {
      const obj = f.toObject();
      obj.createdByName = f.createdBy
        ? f.createdBy.name || f.createdBy.email
        : null;
      return obj;
    });
    // load related proposals and agreements
    const proposals = await Proposal.find({ lead: lead._id }).sort({
      createdAt: -1
    });
    const agreements = await Agreement.find({ lead: lead._id }).sort({
      createdAt: -1
    });
    res.render('leads/lead_view', {
      admin: req.user,
      lead,
      followups,
      proposals,
      agreements
    });
  } catch (err) {
    req.flash('error_msg', 'Error loading lead');
    res.redirect('/admin/leads');
  }
});

///////////////////////
////create follloup///

router.post('/followups/create', async (req, res) => {
  const { lead, note } = req.body;
  try {
    const f = new Followup({ lead, note, createdBy: req.user._id });
    await f.save();
    await Lead.findByIdAndUpdate(lead, {
      lastFollowupAt: f.createdAt,
      lastFollowupNote: note
    });
    res.redirect(req.get('referer') || '/admin/leads');
  } catch (err) {
    req.flash('error_msg', 'Error adding followup');
    res.redirect(req.get('referer') || '/admin/leads');
  }
});

module.exports = router;
