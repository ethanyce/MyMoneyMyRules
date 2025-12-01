const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

exports.getBudget = async (req, res) => {
    try {
    const { userId } = req.user;
    const { rows } = await db.query(
      `SELECT b.budget_id,
              b.amount_limit,
              b.start_date,
              b.end_date,
              c.category_name,
              c.category_type,
              COALESCE(SUM(t.amount) FILTER (WHERE t.transaction_type = 'expense'), 0) AS spent
       FROM budget b
       JOIN category c ON b.category_id = c.category_id
       LEFT JOIN transaction t ON t.category_id = c.category_id
         AND t.transaction_date BETWEEN b.start_date AND b.end_date
       WHERE b.user_id = $1
       GROUP BY b.budget_id, b.amount_limit, b.start_date, b.end_date, c.category_name, c.category_type
       ORDER BY b.start_date DESC`,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
}

exports.createBudget = async (req, res) => {
    try {
    const { userId } = req.user;
    const { category_name, amount_limit, category_type, start_date, end_date } = req.body;

    let cat = await db.query(
      'SELECT category_id FROM category WHERE user_id = $1 AND category_name = $2',
      [userId, category_name]
    );
    if (cat.rows.length === 0) {
      cat = await db.query(
        `INSERT INTO category (user_id, category_name, category_type)
         VALUES ($1, $2, $3)
         RETURNING category_id`,
        [userId, category_name, category_type || 'expense']
      );
    }
    const categoryId = cat.rows[0].category_id;

    const insert = await db.query(
      `INSERT INTO budget (user_id, category_id, amount_limit, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING budget_id`,
      [userId, categoryId, amount_limit, start_date, end_date]
    );

    res.status(201).json({ budget_id: insert.rows[0].budget_id });
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
}

exports.updateBudget = async (req, res) => {
      try {
    const { userId } = req.user;
    const budgetId = req.params.budgetId;
    const { category_name, amount_limit, category_type, start_date, end_date } = req.body;
    console.log('PUT /api/budgets/:id request by user', userId, 'budgetId', budgetId, 'body', req.body);

    // Ensure the budget exists and belongs to the user
    const existing = await db.query(
      `SELECT b.budget_id, b.category_id FROM budget b WHERE b.budget_id = $1 AND b.user_id = $2`,
      [budgetId, userId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Ensure category exists or create it
    let cat = await db.query(
      'SELECT category_id FROM category WHERE user_id = $1 AND category_name = $2',
      [userId, category_name]
    );
    if (cat.rows.length === 0) {
      cat = await db.query(
        `INSERT INTO category (user_id, category_name, category_type)
         VALUES ($1, $2, $3)
         RETURNING category_id`,
        [userId, category_name, category_type || 'expense']
      );
    }
    const categoryId = cat.rows[0].category_id;

    // Update the budget record
    await db.query(
      `UPDATE budget
       SET category_id = $1, amount_limit = $2, start_date = $3, end_date = $4
       WHERE budget_id = $5 AND user_id = $6`,
      [categoryId, amount_limit, start_date, end_date, budgetId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
}

exports.deleteBudget = async (req, res) => {
    try {
    const { userId } = req.user;
    const budgetId = req.params.budgetId;
    console.log('DELETE /api/budgets/:id request by user', userId, 'budgetId', budgetId);

    // Ensure the budget exists and belongs to the user
    const existing = await db.query(
      `SELECT budget_id FROM budget WHERE budget_id = $1 AND user_id = $2`,
      [budgetId, userId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Delete the budget
    await db.query(`DELETE FROM budget WHERE budget_id = $1 AND user_id = $2`, [budgetId, userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
}

exports.getBudgetSummary = async (req, res) => {
    const { budgetId } = req.params;
    const userId = req.user.userId; // now uses your auth middleware

    try {
    const query = `
      SELECT 
        b.budget_id,
        b.amount_limit,
        COALESCE(SUM(t.amount), 0) AS total_spent,
        (b.amount_limit - COALESCE(SUM(t.amount), 0)) AS remaining
      FROM budget b
      LEFT JOIN transaction t 
        ON b.category_id = t.category_id
        AND t.transaction_type = 'expense'
        AND t.transaction_date BETWEEN b.start_date AND b.end_date
      WHERE b.user_id = $1 AND b.budget_id = $2
      GROUP BY b.budget_id;
    `;

    const result = await db.query(query, [userId, budgetId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching budget summary:', err);
    res.status(500).json({ message: 'Server error' });
  }
}