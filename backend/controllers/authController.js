const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

exports.signup = async (req, res) => 
{
    try
    {
        const {username, email, password, mobile_no} = req.body;
        if (!username || !email || !password)
        {
            return res.status(400).json({error: 'Username, email and password are required'});
        }

        const existing = await db.query
        (
            'SELECT user_id FROM user_profile WHERE email = $1',
            [email]
        );
        if (existing.rows.length > 0)
        {
            return res.status(409).json({error: 'Email already registered'});
        }

        const hashed = await bcrypt.hash(password, 10);
        const insertResult = await db.query
        (
            `INSERT INTO user_profile (username, email, mobile_no, password)
            VALUES ($1, $2, $3, $4)
            RETURNING user_id, username, email`,
            [username, email, mobile_no || null, hashed]
        );

        const user = insertResult.rows[0];
        const token = jwt.sign({userId: user.user_id}, JWT_SECRET, {expiresIn: '7d'});

        res.status(201).json
        ({
            token,
            user:
            {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
            }                
        });
    }
    catch (error)
    {
        console.error('Error during signup', error);
        res.status(500).json({error: 'Failed to sign up'});
    }
};

exports.login = async (req, res) =>
{
try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await db.query(
      'SELECT user_id, username, email, password FROM user_profile WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
}