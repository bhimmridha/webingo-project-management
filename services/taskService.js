const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');
const { parseArrayField, uploadFiles } = require('./attachmentService');
const { sendTaskAssignmentEmail, sendTaskStatusChangeEmail } = require('./emailService');
const { sendUserNotification, emitProjectEvent } = require('./notificationService');

const notifyAssignee = async ({ assignee, issuerName, taskTitle, projectName, type, status, io }) => {
    const notification = {
        title: type === 'assignment' ? 'Task assigned' : 'Task status updated',
        message: type === 'assignment'
            ? `You were assigned to "${taskTitle}" in ${projectName}`
            : `Status of "${taskTitle}" changed to ${status}`,
        type: 'info',
        timestamp: Date.now(),
    };

    sendUserNotification(io, assignee._id, notification);

    if (type === 'assignment') {
        return sendTaskAssignmentEmail(assignee.email, issuerName, taskTitle, projectName);
    }

    return sendTaskStatusChangeEmail(assignee.email, issuerName, taskTitle, status, projectName);
};

const createTask = async ({ projectId, title, description, status, priority, assignees, dueDate, files, userId, issuerName, io }) => {
    const parsedAssignees = parseArrayField(assignees);
    const attachments = await uploadFiles(files);

    const task = await Task.create({
        project: projectId,
        title,
        description,
        status,
        priority,
        assignees: parsedAssignees,
        dueDate,
        attachments,
        createdBy: userId,
    });

    const populatedTask = await Task.findById(task._id).populate('assignees', 'name email profilePicture');
    const project = await Project.findById(projectId).select('name');

    const assigneeUsers = await User.find({ _id: { $in: parsedAssignees } }).select('name email');
    const emailPromises = assigneeUsers
        .filter((assignee) => assignee._id.toString() !== userId.toString())
        .map((assignee) => notifyAssignee({
            assignee,
            issuerName,
            taskTitle: task.title,
            projectName: project?.name || 'a project',
            type: 'assignment',
            io,
        }));

    Promise.allSettled(emailPromises).catch(() => { });
    emitProjectEvent(io, projectId, 'task_created', populatedTask);

    return populatedTask;
};

const getTasks = async ({ projectId, status, priority }) => {
    if (!projectId) return null;
    const query = { project: projectId };
    if (status) query.status = status;
    if (priority) query.priority = priority;

    return Task.find(query)
        .populate('assignees', 'name email profilePicture')
        .sort({ createdAt: -1 });
};

const updateTask = async ({ taskId, updates, files, userId, issuerName, io }) => {
    const task = await Task.findById(taskId);
    if (!task) return null;

    const oldAssignees = task.assignees.map((id) => id.toString());
    const oldStatus = task.status;

    if (updates.assignees) {
        updates.assignees = parseArrayField(updates.assignees);
    }

    if (files && files.length > 0) {
        const newAttachments = await uploadFiles(files);
        updates.attachments = [...task.attachments, ...newAttachments];
    }

    updates.updatedBy = userId;
    const updatedTask = await Task.findByIdAndUpdate(taskId, updates, { new: true })
        .populate('assignees', 'name email profilePicture');

    const newAssignees = updatedTask.assignees.map((assignee) => assignee._id.toString());
    const project = await Project.findById(updatedTask.project).select('name');
    const allAssignees = await User.find({ _id: { $in: Array.from(new Set([...oldAssignees, ...newAssignees])) } }).select('name email');
    const addedAssignees = newAssignees.filter((id) => !oldAssignees.includes(id));
    const statusChanged = updates.status && updates.status !== oldStatus;

    const emailPromises = [];
    allAssignees.forEach((assignee) => {
        const isNew = addedAssignees.includes(assignee._id.toString());
        const isAssigned = newAssignees.includes(assignee._id.toString());

        if (isNew) {
            emailPromises.push(notifyAssignee({
                assignee,
                issuerName: '',
                taskTitle: updatedTask.title,
                projectName: project?.name || 'a project',
                type: 'assignment',
                io,
            }));
        }

        if (statusChanged && isAssigned && assignee._id.toString() !== userId.toString()) {
            emailPromises.push(notifyAssignee({
                assignee,
                issuerName: '',
                taskTitle: updatedTask.title,
                projectName: project?.name || 'a project',
                type: 'status',
                status: updatedTask.status,
                io,
            }));
        }
    });

    Promise.allSettled(emailPromises).catch(() => { });
    emitProjectEvent(io, updatedTask.project.toString(), 'task_updated', updatedTask);

    return updatedTask;
};

const deleteTask = async ({ taskId, userId, io }) => {
    const task = await Task.findByIdAndDelete(taskId);
    if (!task) return null;

    emitProjectEvent(io, task.project.toString(), 'task_deleted', taskId);

    await ActivityLog.create({
        project: task.project,
        user: userId,
        action: 'task_deleted',
        details: `Deleted task: ${task.title}`,
    });

    return task;
};

const bulkUpdateStatus = async ({ taskIds, status, userId }) => {
    const result = await Task.updateMany(
        { _id: { $in: taskIds } },
        { status, updatedBy: userId }
    );
    return result.modifiedCount;
};

const bulkDelete = async ({ taskIds }) => {
    const result = await Task.deleteMany({ _id: { $in: taskIds } });
    return result.deletedCount;
};

module.exports = {
    createTask,
    getTasks,
    updateTask,
    deleteTask,
    bulkUpdateStatus,
    bulkDelete,
};
