const {
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
} = require('../services/projectService');

exports.createProject = async (req, res) => {
  const { name, description } = req.body;
  const project = await createProject({ name, description, userId: req.user._id });
  res.status(201).json(project);
};

exports.getProjects = async (req, res) => {
  const projects = await getProjectsForUser(req.user._id);
  res.json(projects);
};

exports.getProjectById = async (req, res) => {
  const project = await getProjectByIdForUser(req.params.id, req.user._id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  res.json(project);
};

exports.updateProject = async (req, res) => {
  const project = await updateProject(req.project, req.body, req.user._id);
  res.json(project);
};

exports.deleteProject = async (req, res) => {
  await deleteProjectAndTasks(req.project);
  res.json({ message: 'Project deleted successfully' });
};

exports.addMember = async (req, res) => {
  const { email, role } = req.body;
  const result = await addProjectMember({
    project: req.project,
    email,
    role,
    inviterId: req.user._id,
    inviterName: req.user.name,
    io: req.io,
  });

  if (result.error) {
    return res.status(400).json({ message: result.error });
  }

  res.json(result.project);
};

exports.removeMember = async (req, res) => {
  const { memberId } = req.params;

  if (memberId === req.user._id.toString()) {
    return res.status(400).json({ message: 'Cannot remove yourself from the project' });
  }

  req.project.members = req.project.members.filter(
    (m) => (m.user._id || m.user).toString() !== memberId
  );
  await req.project.save();

  res.json({ message: 'Member removed' });
};

exports.sendInvitation = async (req, res) => {
  const { email, role } = req.body;
  const result = await sendProjectInvitation({
    project: req.project,
    email,
    role,
    inviterId: req.user._id,
    inviterName: req.user.name,
    io: req.io,
  });

  if (result.error) {
    return res.status(400).json({ message: result.error });
  }

  res.json({ message: `Invitation sent to ${email}` });
};

exports.acceptInvitation = async (req, res) => {
  const result = await acceptInvitation(req.params.token);
  if (result.error) {
    return res.status(400).json({ message: result.error });
  }

  res.json({ message: `Joined project "${result.project.name}" successfully`, projectId: result.project._id });
};

exports.getActivityLog = async (req, res) => {
  const { id: projectId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const data = await getActivityLog(projectId, page, limit);
  res.json(data);
};

exports.getProjectStats = async (req, res) => {
  const stats = await getProjectStats(req.params.id);
  res.json(stats);
};
