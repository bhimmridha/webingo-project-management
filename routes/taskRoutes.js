const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { createTask, getTasks, updateTask, deleteTask, bulkUpdateStatus, bulkDelete } = require('../controllers/taskController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.use(protect);

router.route('/')
  .post(upload.array('attachments', 5), asyncHandler(createTask))
  .get(asyncHandler(getTasks));

router.route('/:id')
  .put(upload.array('attachments', 5), asyncHandler(updateTask))
  .delete(asyncHandler(deleteTask));

// Bulk operations
router.put('/bulk/status', asyncHandler(bulkUpdateStatus));
router.post('/bulk/delete', asyncHandler(bulkDelete));

module.exports = router;
