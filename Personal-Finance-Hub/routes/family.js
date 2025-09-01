const express = require('express');
const Family = require('../models/Family');
const SharedExpense = require('../models/SharedExpense');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();


router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Family name is required" });
    }
    
    const family = new Family({
      name,
      description,
      createdBy: req.user._id,
      members: [{
        userId: req.user._id,
        role: 'admin',
        permissions: {
          canAddExpenses: true,
          canEditBudgets: true,
          canViewReports: true,
          canInviteMembers: true
        }
      }]
    });
    
    await family.save();
    await family.populate('members.userId', 'name email');
    
    res.status(201).json(family);
  } catch (error) {
    console.error("Error creating family:", error);
    res.status(400).json({ error: error.message });
  }
});


router.get('/', auth, async (req, res) => {
  try {
    const families = await Family.find({
      'members.userId': req.user._id
    }).populate('members.userId', 'name email');
    
    res.json(families);
  } catch (error) {
    console.error("Error fetching families:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/:id', auth, async (req, res) => {
  try {
    const family = await Family.findById(req.params.id)
      .populate('members.userId', 'name email')
      .populate('createdBy', 'name email');
    
    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }
    
    
    const isMember = family.members.some(member => 
      member.userId._id.toString() === req.user._id.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    res.json(family);
  } catch (error) {
    console.error("Error fetching family:", error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    const family = await Family.findById(req.params.id);
    
    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }
    
    
    if (!family.canUserPerformAction(req.user._id, 'canInviteMembers')) {
      return res.status(403).json({ error: "You don't have permission to invite members" });
    }
    
    
    const existingMember = family.members.find(member => 
      member.userId.toString() === req.user._id.toString()
    );
    
    if (existingMember) {
      return res.status(400).json({ error: "User is already a member" });
    }
    
    
    const existingInvitation = family.invitations.find(inv => 
      inv.email === email.toLowerCase() && inv.status === 'pending'
    );
    
    if (existingInvitation) {
      return res.status(400).json({ error: "Invitation already sent to this email" });
    }
    
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); 
    
    family.invitations.push({
      email: email.toLowerCase(),
      invitedBy: req.user._id,
      role,
      token,
      expiresAt
    });
    
    await family.save();
    
    
    res.json({
      message: "Invitation sent successfully",
      invitationToken: token 
    });
  } catch (error) {
    console.error("Error inviting member:", error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/accept-invitation/:token', auth, async (req, res) => {
  try {
    const family = await Family.findOne({
      'invitations.token': req.params.token,
      'invitations.status': 'pending'
    });
    
    if (!family) {
      return res.status(404).json({ error: "Invalid or expired invitation" });
    }
    
    const invitation = family.invitations.find(inv => 
      inv.token === req.params.token
    );
    
    
    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      await family.save();
      return res.status(400).json({ error: "Invitation has expired" });
    }
    
    
    if (invitation.email !== req.user.email.toLowerCase()) {
      return res.status(403).json({ error: "This invitation is not for your email address" });
    }
    
    
    await family.addMember(req.user._id, invitation.role);
    
    
    invitation.status = 'accepted';
    await family.save();
    
    await family.populate('members.userId', 'name email');
    
    res.json({
      message: "Successfully joined the family",
      family
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    res.status(500).json({ error: error.message });
  }
});


router.delete('/:id/members/:memberId', auth, async (req, res) => {
  try {
    const family = await Family.findById(req.params.id);
    
    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }
    
    
    const userMember = family.members.find(member => 
      member.userId.toString() === req.user._id.toString()
    );
    
    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({ error: "Only admins can remove members" });
    }
    
    
    if (family.createdBy.toString() === req.params.memberId) {
      return res.status(400).json({ error: "Cannot remove the family creator" });
    }
    
    await family.removeMember(req.params.memberId);
    
    res.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ error: error.message });
  }
});


router.put('/:id/members/:memberId/role', auth, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    
    const family = await Family.findById(req.params.id);
    
    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }
    
    
    const userMember = family.members.find(member => 
      member.userId.toString() === req.user._id.toString()
    );
    
    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({ error: "Only admins can update member roles" });
    }
    
    
    if (family.createdBy.toString() === req.params.memberId) {
      return res.status(400).json({ error: "Cannot change the family creator's role" });
    }
    
    await family.updateMemberRole(req.params.memberId, role);
    
    res.json({ message: "Member role updated successfully" });
  } catch (error) {
    console.error("Error updating member role:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/:id/expenses', auth, async (req, res) => {
  try {
    const { startDate, endDate, category, status } = req.query;
    
    const family = await Family.findById(req.params.id);
    
    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }
    
    
    const isMember = family.members.some(member => 
      member.userId.toString() === req.user._id.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    
    const query = { familyId: req.params.id };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    if (category) query.category = category;
    if (status) query.status = status;
    
    const expenses = await SharedExpense.find(query)
      .populate('paidBy.userId', 'name email')
      .populate('splits.userId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ date: -1 });
    
    res.json(expenses);
  } catch (error) {
    console.error("Error fetching family expenses:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
