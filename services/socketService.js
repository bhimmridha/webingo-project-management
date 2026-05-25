const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Track active users per project
const activeUsers = new Map(); // projectId -> Set of { socketId, userId, userName }

module.exports = (io) => {
  // Socket.io authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('name email');
        if (user) {
          socket.user = user;
        }
      }
      next();
    } catch (err) {
      // Allow connection even without auth for now, but mark as unauthenticated
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}${socket.user ? ` (${socket.user.name})` : ''}`);

    if (socket.user) {
      const userRoom = `user_${socket.user._id}`;
      socket.join(userRoom);
    }

    // Join project room
    socket.on('join_project', (projectId) => {
      socket.join(projectId);

      // Track active user
      if (socket.user) {
        if (!activeUsers.has(projectId)) {
          activeUsers.set(projectId, new Map());
        }
        activeUsers.get(projectId).set(socket.id, {
          socketId: socket.id,
          userId: socket.user._id.toString(),
          userName: socket.user.name,
        });

        // Broadcast active users
        io.to(projectId).emit('active_users', Array.from(activeUsers.get(projectId).values()));
        io.to(projectId).emit('user_joined', { userName: socket.user.name });
      }

      socket.currentProject = projectId;
      console.log(`User ${socket.id} joined project room: ${projectId}`);
    });

    // Leave project room
    socket.on('leave_project', (projectId) => {
      socket.leave(projectId);

      if (activeUsers.has(projectId)) {
        activeUsers.get(projectId).delete(socket.id);
        io.to(projectId).emit('active_users', Array.from(activeUsers.get(projectId).values()));
        if (socket.user) {
          io.to(projectId).emit('user_left', { userName: socket.user.name });
        }
      }

      socket.currentProject = null;
      console.log(`User ${socket.id} left project room: ${projectId}`);
    });

    // Live collaboration - user is editing a task
    socket.on('editing_task', ({ projectId, taskId }) => {
      socket.to(projectId).emit('user_editing', {
        taskId,
        userName: socket.user?.name || 'Unknown',
        userId: socket.user?._id?.toString(),
      });
    });

    // User stopped editing
    socket.on('stop_editing_task', ({ projectId, taskId }) => {
      socket.to(projectId).emit('user_stopped_editing', {
        taskId,
        userId: socket.user?._id?.toString(),
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);

      // Remove from all project rooms
      activeUsers.forEach((users, projectId) => {
        if (users.has(socket.id)) {
          users.delete(socket.id);
          io.to(projectId).emit('active_users', Array.from(users.values()));
          if (socket.user) {
            io.to(projectId).emit('user_left', { userName: socket.user.name });
          }
        }
      });
    });
  });
};
