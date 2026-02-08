const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const SibApiV3Sdk = require('sib-api-v3-sdk');
const Proposal = require('../../models/Proposal');
const Lead = require('../../models/Lead');
const sendMail = require('../../config/brevoMail');
const { ensureAdmin } = require('./utils');

// router.use(ensureAdmin);

// Proposals (admin)
router.get('/', async (req, res) => {
  try {
    const proposals = await Proposal.find()
      .populate('lead')
      .populate('createdBy', 'name email')
      .populate('sentBy', 'name email')
      .sort({ createdAt: -1 });
    res.render('admin/proposals_admin', { admin: req.user, proposals });
  } catch (err) {
    req.flash('error_msg', 'Error fetching proposals');
    res.redirect('/admin/dashboard');
  }
});

router.get('/create/:leadId', async (req, res) => {
  const lead = await Lead.findById(req.params.leadId);
  const proposal = lead ? await Proposal.findOne({ lead: lead._id }) : null;
  res.render('proposal/preview', {
    admin: req.user,
    formTitle: 'Create Proposal',
    lead,
    proposal,
    isPublic: false
  });
});

router.post("/preview", (req, res) => {
  console.log("Received proposal preview request:", req.body);
  const { clientName, businessName, services, amount } = req.body;
  res.render("proposal/preview", {
    clientName,
    businessName,
    services: Array.isArray(services) ? services : [services],
    amount
  });
});

router.post('/create', async (req, res) => {
  const { title, content, lead } = req.body;
  let errors = [];
  if (!title) errors.push({ msg: 'Title required' });
  if (errors.length)
    return res.render('proposal/newProposal', {
      admin: req.user,
      formTitle: 'Create Proposal',
      action: '/admin/proposals/create',
      proposal: req.body,
      lead: lead ? await Lead.findById(lead) : null,
      errors
    });
  try {
    const p = new Proposal({
      title,
      content,
      lead,
      createdBy: req.user._id,
      createdByModel: 'User'
    });
    await p.save();
    req.flash('success_msg', 'Proposal created');
    res.redirect('/admin/proposals');
  } catch (err) {
    req.flash('error_msg', 'Error creating proposal');
    res.redirect('/admin/proposals');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id).populate('lead');
    res.render('proposal/preview', { admin: req.user, proposal, isPublic: false });
  } catch (err) {
    req.flash('error_msg', 'Error loading proposal');
    res.redirect('/admin/proposals');
  }
});

//////send proposal
router.get('/send/:leadId', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId);
    if (!lead) {
      req.flash('error_msg', 'Lead not found');
      return res.redirect('/admin/proposals');
    }
    const proposal = await Proposal.findOne({ lead: lead._id });
    res.render('proposal/send_confirm', {
      admin: req.user,
      lead,
      proposal
    });
  } catch (err) {
    req.flash('error_msg', 'Error loading proposal send page');
    res.redirect('/admin/proposals');
  }
});

router.post('/send/mail/:leadId', async (req, res) => {
  try {
    console.log('Send proposal request for lead ID:', req.params.leadId);
    const lead = await Lead.findById(req.params.leadId);
    if (!lead) {
      req.flash('error_msg', 'Lead not found');
      return res.redirect('/admin/proposals');
    }
    if (!lead.email) {
      req.flash('error_msg', 'Lead email is required to send proposal');
      return res.redirect(`/admin/proposals/send/${lead._id}`);
    }

    let proposal = await Proposal.findOne({ lead: lead._id });
    if (!proposal) {
      proposal = new Proposal({
        lead: lead._id,
        createdBy: req.user ? req.user._id : undefined
      });
    }

    const token = proposal.responseToken || crypto.randomBytes(24).toString('hex');
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const viewUrl = `${baseUrl}/proposal/view/${token}`;
    const acceptUrl = `${baseUrl}/proposal/accept/${token}`;
    const rejectUrl = `${baseUrl}/proposal/reject/${token}`;


    const senderName = process.env.BREVO_SENDER_NAME || 'Techlyron';
    const subject = 'Techlyron Proposal - Please Review';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <h2>Project Proposal</h2>
        <p>Hello ${lead.name || 'Client'},</p>
        <p>Please review your proposal and take an action:</p>
        <p><a href="${viewUrl}">View Proposal</a></p>
        <p>
          <a href="${acceptUrl}" style="display:inline-block;margin-right:10px;padding:10px 16px;background:#16a34a;color:#fff;text-decoration:none;border-radius:4px;">Accept Proposal</a>
        </p>
      </div>
    `;

    await sendMail({
      to: lead.email,
      subject,
      html: htmlContent
    });

    proposal.sent = true;
    proposal.status = 'pending';
    proposal.accepted = false;
    proposal.responseToken = token;
    proposal.sentAt = new Date();
    proposal.sentBy = req.user ? req.user._id : undefined;
    proposal.sentToEmail = lead.email;
    await proposal.save();

    req.flash('success_msg', 'Proposal email sent');
    res.redirect('/admin/proposals');
  } catch (err) {
    req.flash('error_msg', 'Error sending proposal email');
    res.redirect('/admin/proposals');
  }
});

module.exports = router;
