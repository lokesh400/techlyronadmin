const express = require('express');
const router = express.Router();
const Proposal = require('../models/Proposal');

router.get('/view/:token', async (req, res) => {
  try {
    const proposal = await Proposal.findOne({ responseToken: req.params.token }).populate('lead');
    if (!proposal || !proposal.lead) {
      return res.status(404).render('proposal/decision', {
        status: 'not-found'
      });
    }
    res.render('proposal/preview', {
      proposal,
      isPublic: true
    });
  } catch (err) {
    res.status(500).render('proposal/decision', {
      status: 'error'
    });
  }
});

router.get('/accept/:token', async (req, res) => {
  try {
    const proposal = await Proposal.findOne({ responseToken: req.params.token }).populate('lead');
    if (!proposal) {
      return res.status(404).render('proposal/decision', {
        status: 'not-found'
      });
    }
    proposal.status = 'accepted';
    proposal.accepted = true;
    proposal.respondedAt = new Date();
    proposal.acceptedAt = proposal.respondedAt;
    proposal.rejectedAt = undefined;
    await proposal.save();
    res.render('proposal/decision', {
      status: 'accepted',
      lead: proposal.lead
    });
  } catch (err) {
    res.status(500).render('proposal/decision', {
      status: 'error'
    });
  }
});

router.get('/reject/:token', async (req, res) => {
  try {
    const proposal = await Proposal.findOne({ responseToken: req.params.token }).populate('lead');
    if (!proposal) {
      return res.status(404).render('proposal/decision', {
        status: 'not-found'
      });
    }
    proposal.status = 'rejected';
    proposal.accepted = false;
    proposal.respondedAt = new Date();
    proposal.rejectedAt = proposal.respondedAt;
    proposal.acceptedAt = undefined;
    await proposal.save();
    res.render('proposal/decision', {
      status: 'rejected',
      lead: proposal.lead
    });
  } catch (err) {
    res.status(500).render('proposal/decision', {
      status: 'error'
    });
  }
});

module.exports = router;
