const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// --- 1. ENTERPRISE SECURITY MIDDLEWARE ---
app.use(helmet());
app.use(cors({
  origin: '*', // For development. Change to 'https://admin.jyanipur.in' in production.
  methods: ['GET', 'POST', 'DELETE']
}));
app.use(express.json());

// --- 2. DATABASE CONNECTION (NeonDB) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for NeonDB
});

// Auto-initialize database tables if they don't exist
const initializeDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        permissions JSONB,
        is_system BOOLEAN DEFAULT FALSE
      );
      
      CREATE TABLE IF NOT EXISTS personnel (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20) UNIQUE NOT NULL,
        role VARCHAR(100) REFERENCES roles(name) ON DELETE SET NULL,
        site VARCHAR(100),
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert default Super Admin role if the table is empty
    const roleCheck = await pool.query('SELECT COUNT(*) FROM roles');
    if (parseInt(roleCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO roles (id, name, permissions, is_system) 
        VALUES ('ROLE-01', 'Super Admin', '["manage_users", "manage_roles", "manage_sites", "view_fleet", "approve_expenses", "manage_security"]', TRUE)
      `);
    }
    console.log('[DATABASE] NeonDB Connected and Tables Verified.');
  } catch (error) {
    console.error('[DATABASE ERROR] Failed to initialize tables:', error);
  }
};

initializeDatabase();

// --- 3. SECURE API ENDPOINTS ---

// Fetch all Roles
app.get('/api/admin/roles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a New Role
app.post('/api/admin/roles', async (req, res) => {
  const { id, name, permissions } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO roles (id, name, permissions, is_system) VALUES ($1, $2, $3, false) RETURNING *',
      [id, name, JSON.stringify(permissions)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Role creation failed. Name might already exist.' });
  }
});

// Fetch all Users
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM personnel ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register a New User
app.post('/api/admin/users', async (req, res) => {
  const { id, name, email, phone, role, site } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO personnel (id, name, email, phone, role, site) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, name, email, phone, role, site]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'User registration failed. Phone number might already be registered.' });
  }
});

// Revoke (Delete) a User
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM personnel WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'User access revoked.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a Role
app.delete('/api/admin/roles/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM roles WHERE id = $1 AND is_system = false', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Cannot delete this role. Ensure no users are assigned to it.' });
  }
});

// --- 4. START THE FORTRESS ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[JYANIPUR COMMAND] Backend Fortress running on port ${PORT}`);
});