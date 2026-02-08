const express = require('express');
const router = express.Router();
const dayjs = require('dayjs');
const Project = require('../../models/Project');
const { ensureAdmin } = require('./utils');

router.use(ensureAdmin);

// Projects (admin)
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.render('admin/projects_admin', { admin: req.user, projects });
  } catch (err) {
    req.flash('error_msg', 'Error fetching projects');
    res.redirect('/admin/dashboard');
  }
});

router.get('/create', (req, res) => {
  res.render('admin/project_form', {
    admin: req.user,
    formTitle: 'Create Project',
    action: '/admin/projects/create',
    project: null,
    errors: []
  });
});

router.post('/create', async (req, res) => {
  const {
    projectName,
    clientName,
    mobile,
    businessName,
    totalAmount,
    projectCreatedDate,
    liveDate
  } = req.body;

  let errors = [];
  if (!projectName) errors.push({ msg: 'Project name is required' });
  if (!clientName) errors.push({ msg: 'Client name is required' });
  if (!mobile) errors.push({ msg: 'Mobile is required' });
  if (!totalAmount) errors.push({ msg: 'Total amount is required' });

  if (errors.length > 0) {
    return res.render('admin/project_form', {
      admin: req.user,
      formTitle: 'Create Project',
      action: '/admin/projects/create',
      project: req.body,
      errors
    });
  }

  try {
    const servicesRaw = req.body.services;
    const services = Array.isArray(servicesRaw)
      ? servicesRaw.map(s => s.trim()).filter(Boolean)
      : servicesRaw
      ? [servicesRaw.trim()]
      : [];

    const paymentAmounts = req.body.paymentAmount;
    const paymentModes = req.body.paymentMode;
    const paymentDates = req.body.paymentDate;
    const paymentNotes = req.body.paymentNote;

    const payments = [];
    let totalPaid = 0;

    if (paymentAmounts) {
      const amounts = Array.isArray(paymentAmounts)
        ? paymentAmounts
        : [paymentAmounts];
      const modes = Array.isArray(paymentModes) ? paymentModes : [paymentModes];
      const dates = Array.isArray(paymentDates) ? paymentDates : [paymentDates];
      const notes = Array.isArray(paymentNotes) ? paymentNotes : [paymentNotes];

      amounts.forEach((amount, idx) => {
        const numericAmount = Number(amount);
        if (!Number.isNaN(numericAmount) && numericAmount > 0) {
          payments.push({
            amount: numericAmount,
            mode: modes[idx] || 'Cash',
            paidOn: dates[idx] ? new Date(dates[idx]) : new Date(),
            note: notes[idx] || ''
          });
          totalPaid += numericAmount;
        }
      });
    }

    const liveDateValue = liveDate ? new Date(liveDate) : null;
    const dueDateValue = liveDateValue
      ? dayjs(liveDateValue).add(1, 'year').toDate()
      : null;

    let status = 'Pending';
    if (liveDateValue) status = 'Live';
    if (dueDateValue && dayjs().isAfter(dayjs(dueDateValue))) status = 'Expired';

    const project = new Project({
      projectName,
      clientName,
      mobile,
      businessName,
      services,
      totalAmount: Number(totalAmount),
      payments,
      totalPaid,
      projectCreatedDate: projectCreatedDate
        ? new Date(projectCreatedDate)
        : undefined,
      liveDate: liveDateValue || undefined,
      dueDate: dueDateValue || undefined,
      status
    });

    await project.save();
    req.flash('success_msg', 'Project created');
    res.redirect('/admin/projects');
  } catch (err) {
    req.flash('error_msg', 'Error creating project');
    res.redirect('/admin/projects');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      req.flash('error_msg', 'Project not found');
      return res.redirect('/admin/projects');
    }
    res.render('admin/project_view', { admin: req.user, project });
  } catch (err) {
    req.flash('error_msg', 'Error loading project');
    res.redirect('/admin/projects');
  }
});

module.exports = router;
