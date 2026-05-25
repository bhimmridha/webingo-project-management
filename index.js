require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");

// Initialize app
const app = express();
const server = http.createServer(app);

// --------------------
// SECURITY + MIDDLEWARE
// --------------------
app.use(helmet());

const CLIENT_URL = "https://webingo-project-management.vercel.app";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.set("trust proxy", 1);

// --------------------
// SOCKET.IO SETUP
// --------------------
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
  transports: ["polling", "websocket"], // IMPORTANT for Render
});

// Debug socket errors
io.engine.on("connection_error", (err) => {
  console.log("❌ Socket connection error:", err.message);
});

// Connection handler
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// Make io available in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --------------------
// ROUTES
// --------------------
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/projects", require("./routes/projectRoutes"));
app.use("/api/tasks", require("./routes/taskRoutes"));

// 404
app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handler (last)
app.use(errorHandler);

// --------------------
// START SERVER (FIXED IMPORTANT PART)
// --------------------
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
  });

module.exports = { app, server };