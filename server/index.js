import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';

// Configure dotenv
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept all file types
    cb(null, true);
  }
});

// Database connection pool
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'pharmis_password',
  database: process.env.DB_NAME || 'pharmis_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true 
};

const pool = mysql.createPool(dbConfig);

// Test database connection
pool.getConnection()
  .then(async (connection) => {
    console.log('Database connected successfully');
    
    // Check and update medical_files table
    try {
      // Check if file_data column exists
      const [columns] = await connection.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'medical_files' AND COLUMN_NAME = 'file_data'"
      );
      
      if (columns.length === 0) {
        console.log('Adding file_data column to medical_files table...');
        await connection.query(
          'ALTER TABLE medical_files ADD COLUMN file_data LONGBLOB NOT NULL AFTER original_name'
        );
        console.log('file_data column added successfully');
      }
    } catch (error) {
      console.error('Error updating medical_files table:', error);
    }
    
    connection.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1); // Exit if database connection fails
  });

// Add error handler for pool
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection was closed. Reconnecting...');
  } else if (err.code === 'ER_CON_COUNT_ERROR') {
    console.error('Database has too many connections');
  } else if (err.code === 'ECONNREFUSED') {
    console.error('Database connection was refused');
  } else {
    console.error('Database error:', err);
  }
  });

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.warn(`[AUTH] No token provided for ${req.method} ${req.originalUrl}`);
    console.warn(`[AUTH] Headers:`, req.headers);
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'pharmis_secret_key');
    req.user = verified;
    next();
  } catch (err) {
    console.warn(`[AUTH] Invalid token for ${req.method} ${req.originalUrl}`);
    console.warn(`[AUTH] Headers:`, req.headers);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Log activity
const logActivity = async (userId, activityType, description) => {
  try {
    await pool.query(
      'INSERT INTO activity_logs (user_id, activity_type, description) VALUES (?, ?, ?)',
      [userId, activityType, description]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// =========== AUTH ROUTES ===========

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      // Log registration attempt with existing email
      await logActivity(existingUsers[0].id, 'REGISTER_FAILED', `Registration attempted with existing email: ${email}`);
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user
      const [result] = await connection.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );
    const userId = result.insertId;
    // Create initial profile
      await connection.query('INSERT INTO profiles (user_id) VALUES (?)', [userId]);
      // test
      // Create initial emergency contact
      await connection.query(
        'INSERT INTO emergency_contacts (user_id, name, relationship, phone) VALUES (?, ?, ?, ?)',
        [userId, '', '', '']
      );
    
    // Generate token
    const token = jwt.sign(
      { id: userId, name, email },
      process.env.JWT_SECRET || 'pharmis_secret_key',
      { expiresIn: '30d' }
    );
      
      // Commit transaction
      await connection.commit();
    
    // Log successful registration
    await logActivity(userId, 'REGISTER_SUCCESS', 'User successfully created an account');
    
    res.status(201).json({
      token,
      user: { id: userId, name, email }
    });
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    // Log registration error
    await logActivity(null, 'REGISTER_ERROR', `Registration failed with error: ${error.message}`);
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message || 'Server error during registration' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      // Log failed login attempt with non-existent account
      await logActivity(null, 'LOGIN_FAILED', `Failed login attempt with non-existent email: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const user = users[0];
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      // Log failed login attempt with wrong password
      await logActivity(user.id, 'LOGIN_FAILED', 'Failed login attempt with incorrect password');
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, name: user.username, email: user.email },
      process.env.JWT_SECRET || 'pharmis_secret_key',
      { expiresIn: '30d' }
    );
    
    // Log successful login
    await logActivity(user.id, 'LOGIN_SUCCESS', 'User logged in successfully');
    
    res.json({
      token,
      user: { id: user.id, name: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [users] = await pool.query('SELECT id, username, email, created_at FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // For frontend compatibility, return 'name' as username
    const user = users[0];
    res.json({
      id: user.id,
      name: user.username,
      email: user.email,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========== PROFILE ROUTES ===========

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  console.log(`[ROUTE] GET /api/profile hit. Headers:`, req.headers);
  try {
    const userId = req.user.id;
    // Get user info (name/email)
    const [users] = await pool.query(
      'SELECT username AS name, email FROM users WHERE id = ?',
      [userId]
    );
    const userInfo = users[0] || {};
    // Get profile data
    const [profiles] = await pool.query(
      'SELECT * FROM profiles WHERE user_id = ?',
      [userId]
    );
    if (profiles.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    const profile = profiles[0];
    // Get emergency contact
    const [contacts] = await pool.query(
      'SELECT * FROM emergency_contacts WHERE user_id = ?',
      [userId]
    );
    const emergencyContact = contacts.length > 0 ? contacts[0] : null;
    // Get allergies
    const [allergies] = await pool.query(
      'SELECT name FROM allergies WHERE user_id = ?',
      [userId]
    );
    // Get conditions
    const [conditions] = await pool.query(
      'SELECT name FROM medical_conditions WHERE user_id = ?',
      [userId]
    );
    // Get medications
    const [medications] = await pool.query(
      'SELECT name, dosage FROM medications WHERE user_id = ?',
      [userId]
    );
    res.json({
      ...userInfo,
      ...profile,
      emergencyContact,
      allergies: allergies.map(a => a.name),
      conditions: conditions.map(c => c.name),
      medications: medications.map(m => ({ name: m.name, dosage: m.dosage }))
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  console.log(`[ROUTE] PUT /api/profile hit. Headers:`, req.headers);
  try {
    const userId = req.user.id;
    const {
      name,
      email,
      phone,
      date_of_birth,
      gender,
      height,
      weight,
      blood_type,
      emergencyContact,
      allergies,
      conditions,
      medications
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    // Log received payload for debugging
    console.log('Profile update payload:', req.body);
    
    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      // Update user info
      await connection.query(
        'UPDATE users SET username = ?, email = ? WHERE id = ?',
        [name, email, userId]
      );

      // Update profile
      await connection.query(
        `UPDATE profiles SET 
          phone = ?,
          date_of_birth = ?, 
          gender = ?, 
          height = ?, 
          weight = ?, 
          blood_type = ?
        WHERE user_id = ?`,
        [
          phone || null,
          date_of_birth || null,
          gender || null,
          height || null,
          weight || null,
          blood_type || null,
          userId
        ]
      );

      // Update emergency contact
      if (emergencyContact) {
        // Check if emergency contact exists
        const [existingContacts] = await connection.query(
          'SELECT id FROM emergency_contacts WHERE user_id = ?',
          [userId]
        );

        if (existingContacts.length > 0) {
          // Update existing contact
          await connection.query(
            `UPDATE emergency_contacts SET 
              name = ?,
              relationship = ?,
              phone = ? 
            WHERE user_id = ?`,
            [
              emergencyContact.name || '',
              emergencyContact.relationship || '',
              emergencyContact.phone || '',
              userId
            ]
          );
        } else {
          // Create new contact
          await connection.query(
            `INSERT INTO emergency_contacts 
              (user_id, name, relationship, phone) 
            VALUES (?, ?, ?, ?)`,
            [
              userId,
              emergencyContact.name || '',
              emergencyContact.relationship || '',
              emergencyContact.phone || ''
            ]
          );
        }
      }
      
      // Update allergies
      if (allergies) {
        await connection.query('DELETE FROM allergies WHERE user_id = ?', [userId]);
        if (allergies.length > 0) {
          const allergyValues = allergies.map(allergy => [userId, allergy]);
          await connection.query(
            'INSERT INTO allergies (user_id, name) VALUES ?',
            [allergyValues]
          );
        }
      }
      
      // Update conditions
      if (conditions) {
        await connection.query('DELETE FROM medical_conditions WHERE user_id = ?', [userId]);
        if (conditions.length > 0) {
          const conditionValues = conditions.map(condition => [userId, condition]);
          await connection.query(
            'INSERT INTO medical_conditions (user_id, name) VALUES ?',
            [conditionValues]
          );
        }
      }
      
      // Update medications
      if (medications) {
        await connection.query('DELETE FROM medications WHERE user_id = ?', [userId]);
        if (medications.length > 0) {
          const medicationValues = medications.map(med => [userId, med.name, med.dosage || null]);
          await connection.query(
            'INSERT INTO medications (user_id, name, dosage) VALUES ?',
            [medicationValues]
          );
        }
      }
      
      await connection.commit();
      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

// Add allergy
app.post('/api/profile/allergies', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { allergy } = req.body;
    if (!allergy) {
      return res.status(400).json({ message: 'Allergy name is required.' });
    }
    await pool.query(
      'INSERT INTO allergies (user_id, name) VALUES (?, ?)',
      [userId, allergy]
    );
    // Return updated list
    const [allergiesList] = await pool.query('SELECT name FROM allergies WHERE user_id = ?', [userId]);
    res.status(201).json({ message: 'Allergy added successfully', allergies: allergiesList.map(a => a.name) });
  } catch (error) {
    console.error('Error adding allergy:', error);
    res.status(500).json({ message: 'Server error while adding allergy' });
  }
});

app.delete('/api/profile/allergies/:allergy', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const allergy = decodeURIComponent(req.params.allergy).trim();
    await pool.query(
      'DELETE FROM allergies WHERE user_id = ? AND LOWER(TRIM(name)) = LOWER(?)',
      [userId, allergy]
    );
    const [allergiesList] = await pool.query('SELECT name FROM allergies WHERE user_id = ?', [userId]);
    res.json({ message: 'Allergy removed successfully', allergies: allergiesList.map(a => a.name) });
  } catch (error) {
    console.error('Error removing allergy:', error);
    res.status(500).json({ message: 'Server error while removing allergy' });
  }
});

// Add condition
app.post('/api/profile/conditions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { condition } = req.body;
    if (!condition) {
      return res.status(400).json({ message: 'Condition name is required.' });
    }
    await pool.query(
      'INSERT INTO medical_conditions (user_id, name) VALUES (?, ?)',
      [userId, condition]
    );
    // Return updated list
    const [conditionsList] = await pool.query('SELECT name FROM medical_conditions WHERE user_id = ?', [userId]);
    res.status(201).json({ message: 'Condition added successfully', conditions: conditionsList.map(c => c.name) });
  } catch (error) {
    console.error('Error adding condition:', error);
    res.status(500).json({ message: 'Server error while adding condition' });
  }
});

app.delete('/api/profile/conditions/:condition', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const condition = decodeURIComponent(req.params.condition).trim();
    await pool.query(
      'DELETE FROM medical_conditions WHERE user_id = ? AND LOWER(TRIM(name)) = LOWER(?)',
      [userId, condition]
    );
    const [conditionsList] = await pool.query('SELECT name FROM medical_conditions WHERE user_id = ?', [userId]);
    res.json({ message: 'Condition removed successfully', conditions: conditionsList.map(c => c.name) });
  } catch (error) {
    console.error('Error removing condition:', error);
    res.status(500).json({ message: 'Server error while removing condition' });
        }
});

// Add medication
app.post('/api/profile/medications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { medication } = req.body;
    if (!medication || !medication.name) {
      return res.status(400).json({ message: 'Medication name is required.' });
    }
    await pool.query(
      'INSERT INTO medications (user_id, name, dosage) VALUES (?, ?, ?)',
      [userId, medication.name, medication.dosage || null]
    );
    // Return updated list
    const [medicationsList] = await pool.query('SELECT name, dosage FROM medications WHERE user_id = ?', [userId]);
    res.status(201).json({ message: 'Medication added successfully', medications: medicationsList.map(m => ({ name: m.name, dosage: m.dosage })) });
    } catch (error) {
    console.error('Error adding medication:', error);
    res.status(500).json({ message: 'Server error while adding medication' });
  }
});

app.delete('/api/profile/medications/:medication', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const medication = decodeURIComponent(req.params.medication).trim();
    await pool.query(
      'DELETE FROM medications WHERE user_id = ? AND LOWER(TRIM(name)) = LOWER(?)',
      [userId, medication]
    );
    const [medicationsList] = await pool.query('SELECT name, dosage FROM medications WHERE user_id = ?', [userId]);
    res.json({ message: 'Medication removed successfully', medications: medicationsList.map(m => ({ name: m.name, dosage: m.dosage })) });
  } catch (error) {
    console.error('Error removing medication:', error);
    res.status(500).json({ message: 'Server error while removing medication' });
  }
});

// =========== DAILY LOG ROUTES ===========

// Get daily logs
app.get('/api/logs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM daily_logs WHERE user_id = ?';
    let params = [userId];
    
    if (startDate && endDate) {
      query += ' AND date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    } else if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY date DESC';
    
    const [logs] = await pool.query(query, params);
    
    // Get the details for each log
    const logsWithDetails = await Promise.all(logs.map(async log => {
      // Get symptoms
      const [symptoms] = await pool.query(
        'SELECT name, severity, notes FROM symptoms WHERE daily_log_id = ?',
        [log.id]
      );
      
      // Get medications
      const [medications] = await pool.query(
        'SELECT name, dosage, taken FROM medication_logs WHERE daily_log_id = ?',
        [log.id]
      );
      
      return {
        ...log,
        symptoms,
        medications
      };
    }));
    
    res.json(logsWithDetails);
  } catch (error) {
    console.error('Error fetching daily logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create daily log
app.post('/api/logs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    let { date, mood, notes, symptoms, medications } = req.body;
    const rawDate = date;
    // Only accept YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format' });
    }
    // Debug log
    console.log(`[DAILY_LOG][CREATE] userId=${userId}, rawDate=${rawDate}, storedDate=${date}`);
    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      // Check if a log already exists for this date
      const [existingLogs] = await connection.query(
        'SELECT id FROM daily_logs WHERE user_id = ? AND date = ?',
        [userId, date]
      );
      let logId;
      if (existingLogs.length > 0) {
        // Update existing log
        logId = existingLogs[0].id;
        await connection.query(
          'UPDATE daily_logs SET mood = ?, notes = ? WHERE id = ?',
          [mood, notes, logId]
        );
        // Delete existing symptoms and medications for this log
        await connection.query('DELETE FROM symptoms WHERE daily_log_id = ?', [logId]);
        await connection.query('DELETE FROM medication_logs WHERE daily_log_id = ?', [logId]);
      } else {
        // Create new log
        const [result] = await connection.query(
          'INSERT INTO daily_logs (user_id, date, mood, notes) VALUES (?, ?, ?, ?)',
          [userId, date, mood, notes]
        );
        logId = result.insertId;
      }
      // Add symptoms
      if (symptoms && symptoms.length > 0) {
        const symptomValues = symptoms.map(symptom => [
          logId,
          symptom.name,
          symptom.severity,
          symptom.notes || null
        ]);
        await connection.query(
          'INSERT INTO symptoms (daily_log_id, name, severity, notes) VALUES ?',
          [symptomValues]
        );
      }
      // Add medications
      if (medications && medications.length > 0) {
        const medicationValues = medications.map(med => [
          logId,
          med.name,
          med.dosage || null,
          med.taken || false
        ]);
        await connection.query(
          'INSERT INTO medication_logs (daily_log_id, name, dosage, taken) VALUES ?',
          [medicationValues]
        );
      }
      await connection.commit();
      // Log activity
      await logActivity(userId, 'DAILY_LOG', 'User added/updated a daily health log');
      res.status(201).json({ id: logId, message: 'Daily log created successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating daily log:', error);
    res.status(500).json({ message: 'Server error during log creation' });
  }
});

// Get latest log timestamp
app.get('/api/logs/latest-timestamp', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [result] = await pool.query(
      `SELECT MAX(created_at) as timestamp 
       FROM (
         SELECT MAX(date) as created_at FROM daily_logs WHERE user_id = ?
         UNION ALL
         SELECT MAX(created_at) FROM activity_logs WHERE user_id = ?
       ) as logs`,
      [userId, userId]
    );
    
    res.json({ timestamp: result[0]?.timestamp || null });
  } catch (error) {
    console.error('Error fetching latest log timestamp:', error);
    res.status(500).json({ message: 'Error fetching latest log timestamp' });
  }
});

// Get a specific daily log
app.get('/api/logs/:date', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.params;
    // Guard: If someone tries to use 'latest-timestamp' as a date, return 400
    if (date === 'latest-timestamp') {
      return res.status(400).json({ message: 'Invalid date parameter' });
    }
    // Get the log
    const [logs] = await pool.query(
      'SELECT * FROM daily_logs WHERE user_id = ? AND date = ?',
      [userId, date]
    );
    
    if (logs.length === 0) {
      return res.status(404).json({ message: 'Daily log not found' });
    }
    
    const log = logs[0];
    
    // Get symptoms
    const [symptoms] = await pool.query(
      'SELECT name, severity, notes FROM symptoms WHERE daily_log_id = ?',
      [log.id]
    );
    
    // Get medications
    const [medications] = await pool.query(
      'SELECT name, dosage, taken FROM medication_logs WHERE daily_log_id = ?',
      [log.id]
    );
    
    res.json({
      ...log,
      symptoms,
      medications
    });
  } catch (error) {
    console.error('Error fetching daily log:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========== LIFESTYLE ROUTES ===========

// Get lifestyle logs
app.get('/api/lifestyle', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM lifestyle_logs WHERE user_id = ?';
    let params = [userId];
    
    if (type) {
      query += ' AND activity_type = ?';
      params.push(type);
    }
    
    if (startDate && endDate) {
      query += ' AND date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    } else if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY date DESC, created_at DESC';
    
    const [logs] = await pool.query(query, params);
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching lifestyle logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create lifestyle log
app.post('/api/lifestyle', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      date, 
      activity_type, 
      activity_name, 
      duration, 
      intensity, 
      quantity, 
      notes 
    } = req.body;
    
    const [result] = await pool.query(
      `INSERT INTO lifestyle_logs 
       (user_id, date, activity_type, activity_name, duration, intensity, quantity, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, date, activity_type, activity_name, duration, intensity, quantity, notes]
    );
    
    // Log activity
    await logActivity(userId, 'LIFESTYLE_LOG', `User logged ${activity_type} activity`);
    
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Lifestyle activity logged successfully' 
    });
  } catch (error) {
    console.error('Error creating lifestyle log:', error);
    res.status(500).json({ message: 'Server error during lifestyle log creation' });
  }
});

// =========== MEDICAL FILES ROUTES ===========

// Get medical files
app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.query;
    
    let query = 'SELECT * FROM medical_files WHERE user_id = ?';
    let params = [userId];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY upload_date DESC';
    
    const [files] = await pool.query(query, params);
    
    res.json(files);
  } catch (error) {
    console.error('Error fetching medical files:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload medical file
app.post('/api/files', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { originalname, mimetype, size, buffer } = req.file;
    
    console.log('Uploading file:', {
      name: originalname,
      type: mimetype,
      size: size,
      category: category
    });
    
    // Insert file record
    const [result] = await pool.query(
      `INSERT INTO medical_files 
       (user_id, name, original_name, file_data, file_size, file_type, category) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, originalname, originalname, buffer, size, mimetype, category]
    );
    
    // Log activity
    await logActivity(userId, 'FILE_UPLOAD', `User uploaded a medical file: ${originalname}`);
    
    res.status(201).json({ 
      id: result.insertId, 
      name: originalname,
      original_name: originalname,
      category,
      message: 'File uploaded successfully' 
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.error('Database schema error:', error.sqlMessage);
      return res.status(500).json({ 
        message: 'Database configuration error. Please contact support.',
        details: error.sqlMessage
      });
    }
    res.status(500).json({ message: 'Server error during file upload' });
  }
});

// Download medical file
app.get('/api/files/:id/download', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const fileId = req.params.id;
    
    // Get file info
    const [files] = await pool.query(
      'SELECT * FROM medical_files WHERE id = ? AND user_id = ?',
      [fileId, userId]
    );
    
    if (files.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    const file = files[0];
    
    // Log activity
    await logActivity(userId, 'FILE_DOWNLOAD', `User downloaded a medical file: ${file.original_name}`);
    
    // Set headers for file download
    res.setHeader('Content-Type', file.file_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    
    // Send file data
    res.send(file.file_data);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Server error during file download' });
  }
});

// Delete medical file
app.delete('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const fileId = req.params.id;
    
    // Get file info
    const [files] = await pool.query(
      'SELECT * FROM medical_files WHERE id = ? AND user_id = ?',
      [fileId, userId]
    );
    
    if (files.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    const file = files[0];
    
    // Delete from database
      await pool.query('DELETE FROM medical_files WHERE id = ?', [fileId]);
      
      // Log activity
      await logActivity(userId, 'FILE_DELETE', `User deleted a medical file: ${file.original_name}`);
      
      res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Server error during file deletion' });
  }
});

// =========== INSIGHTS ROUTES ===========

// Groq API configuration
const GROQ_API_URL = process.env.GROQ_API_URL;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Health insights route
app.get('/api/insights', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeRange = '30' } = req.query; // Default to 30 days

    // Get user's health data from the last specified days
    const [logs] = await pool.query(
      `SELECT dl.*, 
        GROUP_CONCAT(DISTINCT s.name, ':', s.severity) as symptoms,
        GROUP_CONCAT(DISTINCT ml.name) as medications
       FROM daily_logs dl
       LEFT JOIN symptoms s ON s.daily_log_id = dl.id
       LEFT JOIN medication_logs ml ON ml.daily_log_id = dl.id
       WHERE dl.user_id = ? AND dl.date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY dl.id
       ORDER BY dl.date DESC`,
      [userId, timeRange]
    );

    // Format the data for analysis
    const healthData = logs.map(log => ({
      date: log.date,
      mood: log.mood,
      sleep_hours: log.sleep_hours,
      water_intake: log.water_intake,
      exercise_minutes: log.exercise_minutes,
      symptoms: log.symptoms ? log.symptoms.split(',').map(s => {
        const [name, severity] = s.split(':');
        return { name, severity: parseInt(severity) };
      }) : [],
      medications: log.medications ? log.medications.split(',') : []
    }));

    // Generate insights using Groq API
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [{
          role: "system",
          content: `You are a warm, empathetic health coach. For the user's health and lifestyle logs, provide few actionable, practical, and supportive insights around 3-4 lines.
- Reference the user's actual symptoms, notes, mood, medications, and lifestyle logs.
- If the user logs symptoms like depression, anxiety, or pain, suggest self-care actions (rest, hydration, exercise, social support, etc.) and possible over-the-counter remedies, but always add: "Consult your doctor before starting any new medication or supplement."
- If the user writes notes, reference them directly and offer encouragement or practical next steps.
- If the user is taking a medication, mention it by name and remind them to follow their doctor's advice.
- Use a warm, encouraging, and practical tone.
- Never diagnose or prescribe new medications, but you may mention common self-care or OTC options with a disclaimer.
- Format: Title: Content`
        }, {
          role: "user",
          content: `Analyze this health data and provide 2-3 key insights about significant patterns and actionable recommendations. Only provide insights if there is sufficient data to support them. Data: ${JSON.stringify(healthData)}`
        }],
        temperature: 0.8,
        max_tokens: 500
      })
    });

    const groqResult = await response.json();
    if (!groqResult.choices || !Array.isArray(groqResult.choices) || !groqResult.choices[0]?.message?.content) {
      console.error('Groq API error or unexpected response:', groqResult);
      return res.status(500).json({ message: 'AI service error: Unable to generate insights at this time.' });
    }

    // Clean and validate AI response
    let aiAnalysis = groqResult.choices[0].message.content.trim();
    if (!aiAnalysis || aiAnalysis.toLowerCase().includes('not enough data') || aiAnalysis.toLowerCase().includes('insufficient data')) {
      return res.json([]);
    }

    // Parse AI response and store insights
    const insights = aiAnalysis.split('\n')
      .filter(line => line.trim().length > 0)
      .map((insight, index) => {
        const [title, ...contentParts] = insight.split(':');
        const content = contentParts.join(':').trim();
        // Skip insights if they don't have both title and content
        if (!title || !content) return null;
        // Skip insights about mood correlation unless there's strong evidence
        if (title.toLowerCase().includes('mood') && content.toLowerCase().includes('correlation') && !content.match(/\d+%|\d+\s*points?/)) {
          return null;
        }
        const category = determineCategory(insight);
        const generated_date = toMySQLDate(new Date());
        return { 
        id: Date.now() + index,
          title: title.trim().slice(0, 255), 
          content: content.slice(0, 10000),
          category,
          generated_date 
        };
      })
      .filter(Boolean); // Remove null entries

    if (insights.length === 0) {
      return res.json([]);
    }

    // Check if insights have changed since last generation
    const [existingInsights] = await pool.query(
      'SELECT content FROM health_insights WHERE user_id = ? ORDER BY generated_date DESC LIMIT ?',
      [userId, insights.length]
    );

    const insightsChanged = !existingInsights.every((existing, index) => 
      existing.content === insights[index].content
    );

    if (insightsChanged) {
      // Store new insights in database
    for (const insight of insights) {
      await pool.query(
        'INSERT INTO health_insights (user_id, title, content, category, generated_date) VALUES (?, ?, ?, ?, ?)',
        [userId, insight.title, insight.content, insight.category, insight.generated_date]
      );
      }
    }

    res.json(insights);
  } catch (error) {
    console.error('Error generating health insights:', error);
    res.status(500).json({ message: 'Error generating health insights' });
  }
});

function determineCategory(insight) {
  const lowerInsight = insight.toLowerCase();
  if (lowerInsight.includes('sleep')) return 'Sleep';
  if (lowerInsight.includes('exercise') || lowerInsight.includes('activity')) return 'Exercise';
  if (lowerInsight.includes('water') || lowerInsight.includes('hydration')) return 'Hydration';
  if (lowerInsight.includes('mood') || lowerInsight.includes('emotional')) return 'Mood';
  if (lowerInsight.includes('symptom') || lowerInsight.includes('pain')) return 'Symptoms';
  if (lowerInsight.includes('medication') || lowerInsight.includes('medicine')) return 'Medication';
  return 'General';
}

// Update mood chart endpoint to use real-time data
app.get('/api/dashboard/mood-chart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;
    
    const [results] = await pool.query(
      `SELECT date, mood FROM daily_logs 
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY date ASC`,
      [userId, days]
    );
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching mood chart data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get top symptoms
app.get('/api/dashboard/top-symptoms', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [results] = await pool.query(
      `SELECT s.name, COUNT(*) as count 
       FROM symptoms s
       JOIN daily_logs d ON s.daily_log_id = d.id
       WHERE d.user_id = ? AND d.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY s.name
       ORDER BY count DESC
       LIMIT 4`,
      [userId]
    );
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching top symptoms:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get mood average from last 7 days
    const [moodResults] = await pool.query(
      `SELECT COALESCE(AVG(mood), 0) as moodAverage 
       FROM daily_logs 
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
      [userId]
    );
    
    // Get symptoms count for current month
    const [symptomsResults] = await pool.query(
      `SELECT COUNT(*) as symptomsCount 
       FROM symptoms s
       JOIN daily_logs d ON s.daily_log_id = d.id
       WHERE d.user_id = ? AND MONTH(d.date) = MONTH(CURDATE())`,
      [userId]
    );
    
    // Get consecutive days streak
    const [streakResults] = await pool.query(
      `WITH RECURSIVE dates AS (
         SELECT date, 1 as streak
         FROM daily_logs
         WHERE user_id = ? AND date = (
           SELECT MAX(date) FROM daily_logs WHERE user_id = ?
         )
         UNION ALL
         SELECT dl.date, d.streak + 1
         FROM daily_logs dl
         INNER JOIN dates d ON dl.date = DATE_SUB(d.date, INTERVAL 1 DAY)
         WHERE dl.user_id = ?
       )
       SELECT COALESCE(MAX(streak), 0) as logsStreak FROM dates`,
      [userId, userId, userId]
    );
    
    // Get total medical files count
    const [filesResults] = await pool.query(
      `SELECT COUNT(*) as filesCount 
       FROM medical_files 
       WHERE user_id = ?`,
      [userId]
    );
    
    // Convert all values to numbers and ensure they're not null
    const stats = {
      moodAverage: Number(moodResults[0].moodAverage) || 0,
      symptomsCount: Number(symptomsResults[0].symptomsCount) || 0,
      logsStreak: Number(streakResults[0].logsStreak) || 0,
      filesCount: Number(filesResults[0].filesCount) || 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get the latest AI insight for the user (now day-wise)
app.get('/api/insights/latest', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // Get today's date in YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10);
    const [insights] = await pool.query(
      'SELECT * FROM health_insights WHERE user_id = ? AND DATE(generated_date) = ? ORDER BY generated_date DESC LIMIT 1',
      [userId, today]
    );
    if (insights.length === 0) {
      return res.json(null);
    }
    res.json(insights[0]);
  } catch (error) {
    console.error('Error fetching latest AI insight:', error);
    res.status(500).json({ message: 'Error fetching latest AI insight' });
  }
});

// PATCH: Robust MySQL DATETIME normalization for all generated_date usages
function toMySQLDate(date) {
  if (!date) return null;
  // If already in 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS' format
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?/);
    if (match) {
      return match[1] + ' 00:00:00';
    }
  }
  // If Date object
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10) + ' 00:00:00';
  }
  // If timestamp or other, try to parse
  try {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10) + ' 00:00:00';
    }
  } catch {}
  return null;
}

// Helper to get existing insight for user/date (date is always YYYY-MM-DD string)
async function getExistingInsight(userId, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error('[getExistingInsight] BAD DATE FORMAT:', date);
    throw new Error('Date must be in YYYY-MM-DD format');
  }
  const [rows] = await pool.query(
    'SELECT * FROM health_insights WHERE user_id = ? AND DATE(generated_date) = ? LIMIT 1',
    [userId, date]
  );
  return rows.length > 0 ? rows[0] : null;
}

// Get all log dates for a user (as YYYY-MM-DD strings, no conversion)
async function getAllLogDates(userId) {
  try {
    const [dailyLogDates] = await pool.query(
      'SELECT DISTINCT date FROM daily_logs WHERE user_id = ? ORDER BY date ASC',
      [userId]
    );
    const [lifestyleLogDates] = await pool.query(
      'SELECT DISTINCT date FROM lifestyle_logs WHERE user_id = ? ORDER BY date ASC',
      [userId]
    );
    // Always return only YYYY-MM-DD strings
    const toYMD = (d) => (typeof d === 'string' ? d.slice(0, 10) : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
    const allDates = new Set([
      ...dailyLogDates.map(log => toYMD(log.date)),
      ...lifestyleLogDates.map(log => toYMD(log.date))
    ]);
    console.log('[getAllLogDates][finalDates]', Array.from(allDates));
    return Array.from(allDates).sort();
  } catch (error) {
    console.error('Error getting log dates:', error);
    return [];
  }
}

// Utility: Filter and clean AI output for actionable insights (stricter)
function extractActionableInsight(aiAnalysis) {
  if (!aiAnalysis) return null;
  const lines = aiAnalysis.split('\n')
    .map(line => line.trim())
    .filter(line =>
      line &&
      !/GMT|IST|Standard Time|\d{2}:\d{2}/i.test(line) &&
      !/here are \d+-?\d* concrete, actionable, context-aware insights/i.test(line) &&
      !/for the 7-day window ending/i.test(line) &&
      !/AI Health Insight/i.test(line) &&
      !/as a professional healthcare insights/i.test(line) &&
      !/^here (is|are) (the )?generated health insights:?$/i.test(line) &&
      !/^insight:?$/i.test(line)
    );
  // Accept the first line with a colon and at least 10 chars after colon, and not generic
  for (const line of lines) {
    // Remove markdown bold/italics
    const cleanLine = line.replace(/^\*+|\*+$/g, '').replace(/^_+|_+$/g, '');
    const [title, ...contentParts] = cleanLine.split(':');
    const content = contentParts.join(':').trim();
    if (
      title && content && content.length > 10 &&
      !/^here is the insight$/i.test(content) &&
      !/^insight$/i.test(title) &&
      !/^here is the insight$/i.test(title)
    ) {
      return { title: title.trim().slice(0, 255), content: content.slice(0, 10000) };
    }
  }
  // If no 'Title: Content' found, but there is a non-empty, non-generic line, use it as content
  for (const line of lines) {
    const cleanLine = line.replace(/^\*+|\*+$/g, '').replace(/^_+|_+$/g, '');
    if (
      cleanLine.length > 20 &&
      !/no actionable health insight|no health or lifestyle data|not enough data|insufficient data|no data|here is the insight/i.test(cleanLine)
    ) {
      return { title: 'Health Insight', content: cleanLine.slice(0, 10000) };
    }
  }
  // If nothing found, return null
  return null;
}

// PATCH: /api/insights/history - always use date string, never JS Date
app.get('/api/insights/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 7;
    const allDates = await getAllLogDates(userId);
    if (allDates.length === 0) {
      console.log('[INSIGHTS] No log dates found for user', userId);
      return res.json([]);
    }
    let dates = allDates.slice(-days);
    const latestDate = allDates[allDates.length - 1];
    if (!dates.includes(latestDate)) {
      dates.push(latestDate);
    }
    dates = Array.from(new Set(dates)).sort();
    console.log('[INSIGHTS][DATES]', dates);
    const results = [];
    for (const date of dates) {
      console.log('[INSIGHTS][LOOP][TYPE]', typeof date, date);
      try {
        // Always check for existing insight for this exact date
        const existing = await getExistingInsight(userId, date);
        if (existing) {
          results.push(existing);
          continue;
        }
        // Use the current log date as the window end
        const windowEndStr = date;
        // Calculate window start (6 days before the current log date)
        // Use string math, not JS Date
        const windowStartStr = (() => {
          const d = new Date(date + 'T00:00:00');
          d.setDate(d.getDate() - 6);
          return d.toISOString().slice(0, 10);
        })();
        // Fetch daily logs in window
        const [dailyLogs] = await pool.query(
          'SELECT * FROM daily_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC',
          [userId, windowStartStr, windowEndStr]
        );
        // Fetch lifestyle logs in window
        const [lifestyleLogs] = await pool.query(
          'SELECT * FROM lifestyle_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC',
          [userId, windowStartStr, windowEndStr]
        );
        console.log(`[INSIGHTS][${date}] Context:`, JSON.stringify({ dailyLogs, lifestyleLogs }));
        if (dailyLogs.length === 0 && lifestyleLogs.length === 0) {
          const noDataInsight = {
            user_id: userId,
            title: 'No Health Data',
            content: 'No health or lifestyle data was logged for this day.',
            category: 'General',
            generated_date: date + ' 00:00:00'
          };
          await pool.query(
            'INSERT INTO health_insights (user_id, title, content, category, generated_date) VALUES (?, ?, ?, ?, ?)',
            [userId, noDataInsight.title, noDataInsight.content, noDataInsight.category, noDataInsight.generated_date]
          );
          results.push(noDataInsight);
          continue;
        }
        const context = { dailyLogs, lifestyleLogs };
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama3-70b-8192',
            messages: [
              {
                role: 'system',
                content: `You are a data-driven health coach analyzing the user's health logs. Your insights MUST follow this EXACT format:

Title: [Specific Pattern or Issue]: [Data-driven observation with specific numbers and timeframes]

Content: [Reference exact data points] Try these specific steps: 1) [Concrete action with specific numbers], 2) [Concrete action with specific numbers], 3) [Concrete action with specific numbers].

Examples of good insights:

"Mood and Sleep Pattern: Your mood has been consistently low (2-3/10) for the past 3 days, coinciding with reduced sleep (5-6 hours). Try these specific steps: 1) Set a consistent bedtime of 10 PM, 2) Take a 15-minute walk in the morning sunlight, 3) Track if this improves your mood ratings."

"Headache Management: You've logged headaches with severity 4-5 for the past 4 days, often after long screen sessions. Consider: 1) Taking regular 20-minute screen breaks, 2) Staying hydrated (aim for 8 glasses of water), 3) Using the blue light filter on your devices."

REQUIREMENTS:
1. ALWAYS include specific numbers (e.g., "2-3/10", "5-6 hours", "4-5 days")
2. ALWAYS provide exactly 3 numbered steps
3. Each step MUST include specific numbers or timeframes
4. NEVER use vague phrases like "try to", "consider", or "might be helpful"
5. NEVER ask rhetorical questions
6. NEVER use phrases like "I noticed" or "I see"
7. ALWAYS reference the exact data from the user's logs
8. If no clear pattern exists in the data, return "No actionable health insight could be generated for this day."
9. Do NOT include any introductory or generic lines (such as "Here are the generated health insights:" or "Insight:"). Only output the actionable insight(s) in the required format.

BAD examples (DO NOT USE):
- "I noticed your mood has been improving..."
- "Try to identify what worked for you..."
- "Consider taking breaks..."
- "It might be helpful to reflect..."`
              },
              {
                role: 'user',
                content: `Analyze this health data and generate insights following the exact format shown. Here is the complete context of the user's logs: ${JSON.stringify(context)}`
              }
            ],
            temperature: 0.7, // Reduced temperature for more consistent formatting
            max_tokens: 500
          })
        });
        const groqResult = await response.json();
        let aiAnalysis = groqResult.choices?.[0]?.message?.content?.trim() || '';
        console.log(`[INSIGHTS][${date}] AI raw:`, aiAnalysis);
        const actionable = extractActionableInsight(aiAnalysis);
        if (!actionable) {
          const noActionable = {
            user_id: userId,
            title: 'No Actionable Insight',
            content: 'No actionable health insight could be generated for this day.',
            category: 'General',
            generated_date: date + ' 00:00:00'
          };
          await pool.query(
            'INSERT INTO health_insights (user_id, title, content, category, generated_date) VALUES (?, ?, ?, ?, ?)',
            [userId, noActionable.title, noActionable.content, noActionable.category, noActionable.generated_date]
          );
          results.push(noActionable);
          continue;
        }
        const category = determineCategory(actionable.title + ': ' + actionable.content);
        const insight = {
          user_id: userId,
          title: actionable.title,
          content: actionable.content,
          category,
          generated_date: date + ' 00:00:00'
        };
        await pool.query(
          'INSERT INTO health_insights (user_id, title, content, category, generated_date) VALUES (?, ?, ?, ?, ?)',
          [userId, insight.title, insight.content, insight.category, insight.generated_date]
        );
        results.push(insight);
      } catch (error) {
        console.error(`Error processing insights for date ${date}:`, error);
        continue;
      }
    }
    res.json(results);
  } catch (error) {
    console.error('Error fetching insights history:', error);
    res.status(500).json({ message: 'Server error while fetching insights history' });
  }
});

// PATCH: /api/insights/generate - add debug logs, loosen filter, always try AI if context exists
app.post('/api/insights/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.body;
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    // Check if insight already exists for this date
    const existing = await getExistingInsight(userId, date);
    if (existing) {
      return res.json(existing);
    }
    // Generate context for this date (past 7 days ending on this date)
    const windowStart = new Date(date);
    windowStart.setDate(windowStart.getDate() - 6);
    const windowStartStr = windowStart.toISOString().slice(0, 10);
    const windowEndStr = date;
    // Fetch daily logs in window
    const [dailyLogs] = await pool.query(
      'SELECT * FROM daily_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC',
      [userId, windowStartStr, windowEndStr]
    );
    // Fetch lifestyle logs in window
    const [lifestyleLogs] = await pool.query(
      'SELECT * FROM lifestyle_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC',
      [userId, windowStartStr, windowEndStr]
    );
    // Debug: Log context
    console.log(`[INSIGHTS][${date}] Context:`, JSON.stringify({ dailyLogs, lifestyleLogs }));
    // If no logs, return no data insight
    if (dailyLogs.length === 0 && lifestyleLogs.length === 0) {
      const noDataInsight = {
        user_id: userId,
        title: 'No Health Data',
        content: 'No health or lifestyle data was logged for this day.',
        category: 'General',
        generated_date: date + ' 00:00:00'
      };
      await pool.query(
        'INSERT INTO health_insights (user_id, title, content, category, generated_date) VALUES (?, ?, ?, ?, ?)',
        [userId, noDataInsight.title, noDataInsight.content, noDataInsight.category, noDataInsight.generated_date]
      );
      return res.json(noDataInsight);
    }
    // Build context for AI
    const context = { dailyLogs, lifestyleLogs };
    // Call Groq API
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a data-driven health coach analyzing the user's health logs. Your insights MUST follow this EXACT format:

Title: [Specific Pattern or Issue]: [Data-driven observation with specific numbers and timeframes]

Content: [Reference exact data points] Try these specific steps: 1) [Concrete action with specific numbers], 2) [Concrete action with specific numbers], 3) [Concrete action with specific numbers].

Examples of good insights:

"Mood and Sleep Pattern: Your mood has been consistently low (2-3/5) for the past 3 days, coinciding with reduced sleep (5-6 hours). Try these specific steps: 1) Set a consistent bedtime of 10 PM, 2) Take a 15-minute walk in the morning sunlight, 3) Track if this improves your mood ratings."

"Headache Management: You've logged headaches with severity 4-5 for the past 4 days, often after long screen sessions. Consider: 1) Taking regular 20-minute screen breaks, 2) Staying hydrated (aim for 8 glasses of water), 3) Using the blue light filter on your devices."

REQUIREMENTS:
1. ALWAYS include specific numbers (e.g., "2-3/10", "5-6 hours", "4-5 days")
2. ALWAYS provide exactly 3 numbered steps
3. Each step MUST include specific numbers or timeframes
4. NEVER use vague phrases like "try to", "consider", or "might be helpful"
5. NEVER ask rhetorical questions
6. NEVER use phrases like "I noticed" or "I see"
7. ALWAYS reference the exact data from the user's logs
8. If no clear pattern exists in the data, return "No actionable health insight could be generated for this day."
9. Do NOT include any introductory or generic lines (such as "Here are the generated health insights:" or "Insight:"). Only output the actionable insight(s) in the required format.

BAD examples (DO NOT USE):
- "I noticed your mood has been improving..."
- "Try to identify what worked for you..."
- "Consider taking breaks..."
- "It might be helpful to reflect..."`
          },
          {
            role: 'user',
            content: `Analyze this health data and generate insights following the exact format shown. Here is the complete context of the user's logs: ${JSON.stringify(context)}`
          }
        ],
        temperature: 0.7, // Reduced temperature for more consistent formatting
        max_tokens: 500
      })
    });
    const groqResult = await response.json();
    let aiAnalysis = groqResult.choices?.[0]?.message?.content?.trim() || '';
    // Debug: Log AI response
    console.log(`[INSIGHTS][${date}] AI raw:`, aiAnalysis);
    const actionable = extractActionableInsight(aiAnalysis);
    if (!actionable) {
      const noActionable = {
        user_id: userId,
        title: 'No Actionable Insight',
        content: 'No actionable health insight could be generated for this day.',
        category: 'General',
        generated_date: date + ' 00:00:00'
      };
      await pool.query(
        'INSERT INTO health_insights (user_id, title, content, category, generated_date) VALUES (?, ?, ?, ?, ?)',
        [userId, noActionable.title, noActionable.content, noActionable.category, noActionable.generated_date]
      );
      return res.json(noActionable);
    }
    const category = determineCategory(actionable.title + ': ' + actionable.content);
    const insight = {
      user_id: userId,
      title: actionable.title,
      content: actionable.content,
      category,
      generated_date: date + ' 00:00:00'
    };
    await pool.query(
      'INSERT INTO health_insights (user_id, title, content, category, generated_date) VALUES (?, ?, ?, ?, ?)',
      [userId, insight.title, insight.content, insight.category, insight.generated_date]
    );
    res.json(insight);
  } catch (error) {
    console.error('Error generating insight:', error);
    res.status(500).json({ message: 'Server error while generating insight' });
  }
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use((req, res, next) => {
  console.warn(`[404] ${req.method} ${req.originalUrl} - Route not found`);
  res.status(404).json({ message: 'Route not found', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});