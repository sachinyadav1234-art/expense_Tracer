const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();
connectDB();

const app = express();

// middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());

// routes
app.use('/api/auth', require('./routes/authRoutes'));



app.use('/api/transactions', require('./routes/transactionRoutes'));

// simple health check route
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Expense Tracker API is running...' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'API is running' });
});

// error handling (routes ke baad hona chahiye)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});