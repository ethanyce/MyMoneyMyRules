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

    const existingCategoryId = existing.rows[0].category_id;

    // Get the current category name
    const currentCatResult = await db.query(
      `SELECT category_name FROM category WHERE category_id = $1`,
      [existingCategoryId]
    );
    const currentCategoryName = currentCatResult.rows.length > 0 ? currentCatResult.rows[0].category_name : null;

    // If the category name has changed, rename the category instead of creating a new one
    if (category_name && category_name !== currentCategoryName) {
      await db.query(
        `UPDATE category
         SET category_name = $1, category_type = $2
         WHERE category_id = $3 AND user_id = $4`,
        [category_name, category_type || 'expense', existingCategoryId, userId]
      );
    }

    // Update the budget record (amounts and dates)
    await db.query(
      `UPDATE budget
       SET amount_limit = $1, start_date = $2, end_date = $3
       WHERE budget_id = $4 AND user_id = $5`,
      [amount_limit, start_date, end_date, budgetId, userId]
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

exports.checkOverlappingBudgets = async (req, res) => {
  try {
    const { userId } = req.user;
    const { category_name, start_date, end_date } = req.query;

    if (!category_name || !start_date || !end_date) {
      return res.json({ hasOverlap: false });
    }

    // Get category_id
    const catResult = await db.query(
      'SELECT category_id FROM category WHERE user_id = $1 AND category_name = $2',
      [userId, category_name]
    );

    if (catResult.rows.length === 0) {
      return res.json({ hasOverlap: false });
    }

    const categoryId = catResult.rows[0].category_id;

    // Check for overlapping budgets
    const overlapResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM budget
       WHERE user_id = $1
         AND category_id = $2
         AND (
           (start_date <= $3 AND end_date >= $3)
           OR (start_date <= $4 AND end_date >= $4)
           OR (start_date >= $3 AND end_date <= $4)
         )`,
      [userId, categoryId, start_date, end_date]
    );

    const hasOverlap = parseInt(overlapResult.rows[0].count) > 0;
    res.json({ hasOverlap });
  } catch (error) {
    console.error('Error checking budget overlap:', error);
    res.status(500).json({ error: 'Failed to check budget overlap' });
  }
}