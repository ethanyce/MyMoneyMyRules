const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

// Handle unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Optionally: gracefully shutdown or attempt recovery
});

// Log database pool errors
db.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

const authRoutes = require('./routes/authRoutes');
const budgetRoutes = require('./routes/budgetsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
//const remindersRoutes = require('./routes/remindersRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const transactionsRoutes = require('./routes/transactionsRoutes');

const app = express();
app.use(express.json());
app.use(cors());

app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

app.get('/api/health', (req, res) => {
  const dbStatus = db && db.threadId ? 'connected' : 'initialized';
  res.json({ status: 'ok', db: dbStatus, time: new Date().toISOString() });
});

app.use('/api', authRoutes);
app.use('/api', budgetRoutes);
app.use('/api', dashboardRoutes);
//app.use('/api', remindersRoutes);
app.use('/api', reportsRoutes);
app.use('/api', transactionsRoutes);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});