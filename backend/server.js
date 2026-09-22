const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Request logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Configure CORS for multi-device / multi-laptop access
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman) or any browser origin
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
  }
});

// Make io accessible to Express route handlers and controllers
app.set('io', io);

// Socket.io Real-time connection management
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Join a specific group room to receive real-time updates
  socket.on('join-group', (groupId) => {
    if (groupId) {
      const room = `group:${groupId}`;
      socket.join(room);
      console.log(`[Socket] ${socket.id} joined ${room}`);
    }
  });

  // Leave group room
  socket.on('leave-group', (groupId) => {
    if (groupId) {
      const room = `group:${groupId}`;
      socket.leave(room);
      console.log(`[Socket] ${socket.id} left ${room}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));

// Simple health check route
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Expense Tracker API is running with real-time sync...' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'API is running' });
});

// Error handling (must be after routes)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} with real-time Socket.io synchronization`);
});