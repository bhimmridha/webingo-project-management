const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  sendInvitation,
  acceptInvitation,
  getActivityLog,
  getProjectStats,
} = require('../controllers/projectController');
const { protect, authorizeProjectRole } = require('../middlewares/authMiddleware');

router.use(protect);

// Accept invitation (needs only auth, not membership)
router.get('/invite/:token', asyncHandler(acceptInvitation));

router.route('/')
  .post(asyncHandler(createProject))
  .get(asyncHandler(getProjects));

router.route('/:id')
  .get(asyncHandler(getProjectById))
  .put(authorizeProjectRole('Admin'), asyncHandler(updateProject))
  .delete(authorizeProjectRole('Admin'), asyncHandler(deleteProject));

// Members management (Admin only)
router.post('/:projectId/members', authorizeProjectRole('Admin'), asyncHandler(addMember));
router.delete('/:projectId/members/:memberId', authorizeProjectRole('Admin'), asyncHandler(removeMember));

// Invitation
router.post('/:projectId/invite', authorizeProjectRole('Admin'), asyncHandler(sendInvitation));

// Activity log (all members)
router.get('/:id/activity', asyncHandler(getActivityLog));

// Stats
router.get('/:id/stats', asyncHandler(getProjectStats));

module.exports = router;
