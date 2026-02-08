const express = require('express')
const passport = require('passport')
const router = express.Router()
const Lead = require('../models/Lead')
const Followup = require('../models/Followup')
const User = require('../models/User')

function ensureWorker (req, res, next) {
  if (req.isAuthenticated() && req.user && req.user.role === 'Worker')
    return next()
  req.flash('error_msg', 'Worker login required')
  res.redirect('/')
}

router.get('/dashboard', ensureWorker, async (req, res) => {
  // show worker's leads
  try {
    const leads = await Lead.find({
      $or: [{ createdBy: req.user._id }, { assignedTo: req.user._id }]
    }).sort({ createdAt: -1 }).populate('assignedTo createdBy name')

    res.render('worker/worker_dashboard', { user: req.user, leads })
  } catch (err) {
    req.flash('error_msg', 'Error loading leads')
    res.redirect('/worker/login')
  }
})

// Worker create lead (assigned to self)
router.get('/leads/create', ensureWorker, (req, res) => {
  res.render('leads/newLead', {
    admin: req.user,
    workers: [], // no need to show workers since it's auto-assigned
    formTitle: 'Create Lead',
    action: '/worker/leads/create',
    lead: null,
    errors: []
  })
})

router.post('/leads/create', ensureWorker, async (req, res) => {
  const { name, contact, email } = req.body
  let errors = []
  if (!name) errors.push({ msg: 'Name required' })
  if (errors.length)
    return res.render('worker/lead_form_worker', {
      user: req.user,
      formTitle: 'Create Lead',
      action: '/worker/leads/create',
      lead: req.body,
      errors
    })
  try {
    const lead = new Lead({
      name,
      contact,
      email,
      assignedTo: req.user._id,
      createdBy: req.user._id,
      createdByModel: 'User'
    })
    await lead.save()
    req.flash('success_msg', 'Lead created')
    res.redirect('/worker/dashboard')
  } catch (err) {
    req.flash('error_msg', 'Error creating lead')
    res.redirect('/worker/dashboard')
  }
})

// Worker add followup

// Worker logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    req.flash('success_msg', 'You are logged out')
    res.redirect('/worker/login')
  })
})

module.exports = router
