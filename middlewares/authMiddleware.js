const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');

// Protect routes - verify JWT
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password -refreshToken');
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      next();
    } catch (error) {
      console.error('Auth error:', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// RBAC - check role in a project
// Supports: req.params.projectId  OR  req.params.id  OR  req.body.projectId
const authorizeProjectRole = (...roles) => {
  return async (req, res, next) => {
    try {
      const projectId =
        req.params.projectId ||
        req.params.id ||
        req.body.projectId;

      if (!projectId) {
        return res.status(400).json({ message: 'Project ID is required' });
      }

      const project = await Project.findById(projectId).populate('members.user', 'name email');
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const member = project.members.find(
        (m) => m.user._id.toString() === req.user._id.toString()
      );

      if (!member) {
        return res.status(403).json({ message: 'Not a member of this project' });
      }

      if (!roles.includes(member.role)) {
        return res.status(403).json({
          message: `Your role "${member.role}" is not authorized for this action`,
        });
      }

      // Attach project & role so controllers don't re-query
      req.project = project;
      req.memberRole = member.role;
      next();
    } catch (error) {
      console.error('RBAC error:', error.message);
      res.status(500).json({ message: 'Server error in role authorization' });
    }
  };
};

module.exports = { protect, authorizeProjectRole };
