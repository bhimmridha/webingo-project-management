const {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  bulkUpdateStatus,
  bulkDelete,
} = require('../services/taskService');

exports.createTask = async (req, res) => {
  const createdTask = await createTask({
    ...req.body,
    files: req.files,
    userId: req.user._id,
    issuerName: req.user.name,
    io: req.io,
  });

  res.status(201).json(createdTask);
};

exports.getTasks = async (req, res) => {
  const tasks = await getTasks(req.query);
  if (!tasks) {
    return res.status(400).json({ message: 'Project ID is required' });
  }
  res.json(tasks);
};

exports.updateTask = async (req, res) => {
  const updatedTask = await updateTask({
    taskId: req.params.id,
    updates: req.body,
    files: req.files,
    userId: req.user._id,
    issuerName: req.user.name,
    io: req.io,
  });

  if (!updatedTask) {
    return res.status(404).json({ message: 'Task not found' });
  }

  res.json(updatedTask);
};

exports.deleteTask = async (req, res) => {
  const task = await deleteTask({ taskId: req.params.id, userId: req.user._id, io: req.io });
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  res.json({ message: 'Task removed' });
};

exports.bulkUpdateStatus = async (req, res) => {
  const { taskIds, status } = req.body;
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return res.status(400).json({ message: 'taskIds array is required' });
  }
  if (!status) return res.status(400).json({ message: 'status is required' });

  const count = await bulkUpdateStatus({ taskIds, status, userId: req.user._id });
  res.json({ message: `${count} tasks updated to ${status}` });
};

exports.bulkDelete = async (req, res) => {
  const { taskIds } = req.body;
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return res.status(400).json({ message: 'taskIds array is required' });
  }

  const count = await bulkDelete({ taskIds });
  res.json({ message: `${count} tasks deleted` });
};

