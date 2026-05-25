const sendUserNotification = (io, userId, notification) => {
    if (!io || !userId) return;
    io.to(`user_${userId}`).emit('notification', notification);
};

const emitProjectEvent = (io, projectId, event, payload) => {
    if (!io || !projectId) return;
    io.to(projectId.toString()).emit(event, payload);
};

module.exports = {
    sendUserNotification,
    emitProjectEvent,
};
