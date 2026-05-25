const crypto = require('crypto');
const Project = require('../models/Project');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const Invitation = require('../models/Invitation');
const { sendInvitationEmail, sendProjectMemberEmail } = require('./emailService');
const { sendUserNotification } = require('./notificationService');

const createProject = async ({ name, description, userId }) => {
    const project = await Project.create({
        name,
        description,
        createdBy: userId,
        members: [{ user: userId, role: 'Admin' }],
    });

    await ActivityLog.create({
        project: project._id,
        user: userId,
        action: 'project_created',
        details: `Project "${project.name}" created`,
    });

    return project;
};

const getProjectsForUser = async (userId) => {
    return Project.find({ 'members.user': userId })
        .populate('members.user', 'name email profilePicture')
        .populate('createdBy', 'name email profilePicture')
        .sort({ createdAt: -1 });
};

const getProjectByIdForUser = async (projectId, userId) => {
    return Project.findOne({ _id: projectId, 'members.user': userId })
        .populate('members.user', 'name email profilePicture');
};

const updateProject = async (project, updates, userId) => {
    const { name, description, status } = updates;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;

    await project.save();
    await project.populate('members.user', 'name email profilePicture');

    await ActivityLog.create({
        project: project._id,
        user: userId,
        action: 'project_updated',
        details: `Project "${project.name}" updated`,
    });

    return project;
};

const deleteProjectAndTasks = async (project) => {
    await Project.findByIdAndDelete(project._id);
    const Task = require('../models/Task');
    await Task.deleteMany({ project: project._id });
};

const addProjectMember = async ({ project, email, role, inviterId, inviterName, io }) => {
    const memberRole = role || 'Viewer';
    const user = await User.findOne({ email });
    if (!user) return { error: 'User not found. They must register first.' };

    const isMember = project.members.some((m) =>
        (m.user._id || m.user).toString() === user._id.toString()
    );
    if (isMember) return { error: 'User is already a member' };

    project.members.push({ user: user._id, role: memberRole });
    await project.save();
    await project.populate('members.user', 'name email profilePicture');

    await ActivityLog.create({
        project: project._id,
        user: inviterId,
        action: 'member_added',
        details: `${user.name} added as ${memberRole}`,
    });

    sendUserNotification(io, user._id, {
        title: 'Added to project',
        message: `You were added to "${project.name}" as ${memberRole}`,
        type: 'info',
        timestamp: Date.now(),
    });

    sendProjectMemberEmail(user.email, inviterName, project.name, memberRole).catch(() => { });

    return { project };
};

const sendProjectInvitation = async ({ project, email, role, inviterId, inviterName, io }) => {
    const existing = await Invitation.findOne({ email, project: project._id, status: 'pending' });
    if (existing) {
        return { error: 'Invitation already sent to this email' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    await Invitation.create({
        project: project._id,
        email,
        role: role || 'Viewer',
        token,
        invitedBy: inviterId,
    });

    const inviteLink = `${process.env.CLIENT_URL}/invite/${token}`;
    await sendInvitationEmail(email, inviterName, project.name, inviteLink);

    const registeredUser = await User.findOne({ email });
    if (registeredUser) {
        sendUserNotification(io, registeredUser._id, {
            title: 'Project invitation',
            message: `You have been invited to join "${project.name}". Check your email to accept.`,
            type: 'info',
            timestamp: Date.now(),
        });
    }

    return { success: true };
};

const acceptInvitation = async (token) => {
    const invitation = await Invitation.findOne({ token, status: 'pending' });
    if (!invitation) return { error: 'Invalid or expired invitation' };
    if (new Date() > invitation.expiresAt) {
        invitation.status = 'expired';
        await invitation.save();
        return { error: 'Invitation has expired' };
    }

    const user = await User.findOne({ email: invitation.email });
    if (!user) return { error: 'Please register with the invited email first' };

    const project = await Project.findById(invitation.project);
    if (!project) return { error: 'Project not found' };

    const isMember = project.members.some((m) => m.user.toString() === user._id.toString());
    if (!isMember) {
        project.members.push({ user: user._id, role: invitation.role });
        await project.save();
    }

    invitation.status = 'accepted';
    await invitation.save();

    return { project, user };
};

const getActivityLog = async (projectId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const logs = await ActivityLog.find({ project: projectId })
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await ActivityLog.countDocuments({ project: projectId });
    return { logs, total, page, totalPages: Math.ceil(total / limit) };
};

const getProjectStats = async (projectId) => {
    const Task = require('../models/Task');
    const stats = await Task.aggregate([
        { $match: { project: require('mongoose').Types.ObjectId.createFromHexString(projectId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const result = { Todo: 0, 'In Progress': 0, Review: 0, Completed: 0 };
    stats.forEach((s) => { result[s._id] = s.count; });
    return result;
};

module.exports = {
    createProject,
    getProjectsForUser,
    getProjectByIdForUser,
    updateProject,
    deleteProjectAndTasks,
    addProjectMember,
    sendProjectInvitation,
    acceptInvitation,
    getActivityLog,
    getProjectStats,
};
