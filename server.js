
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== FRONTEND ====================

app.use(express.static(path.join(__dirname, 'public')));

// ==================== API ROUTES ====================

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/logs', require('./routes/activityLogRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/academic', require('./routes/courseRoutes'));

// ==================== SYSTEM STATUS ====================

app.get('/api/system-status', (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    status: connected ? 'Operational' : 'Database Disconnected',
    system: 'Student Record Management System (MongoDB)',
    database: {
      name: mongoose.connection.name || null,
      readyState: connected ? 'Connected' : 'Disconnected',
      host: mongoose.connection.host || null
    },
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ==================== FRONTEND FALLBACK ====================

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(
      path.join(__dirname, 'public', 'index.html'),
      (err) => {
        if (err && !res.headersSent) {
          next(err);
        }
      }
    );
  }

  next();
});

// ==================== ERROR HANDLER ====================

app.use((err, req, res, next) => {
  console.error('[Internal Server Error]:', err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ==================== START SERVER ====================

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log('=======================================================');
      console.log(' Student Record Management System');
      console.log(` Server: http://localhost:${PORT}`);
      console.log(` Database: ${mongoose.connection.name}`);
      console.log(` Connection: ${mongoose.connection.host}`);
      console.log('=======================================================');
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

// Start only when this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;
