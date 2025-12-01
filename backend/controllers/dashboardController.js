const db = require('../config/db');

exports.metrics = async (req, res) =>
{
    try {
    const { userId } = req.user;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { rows } = await db.query(
      `SELECT transaction_type, amount
       FROM transaction t
       JOIN account a ON t.account_id = a.account_id
       WHERE a.user_id = $1
         AND t.transaction_date >= $2
         AND t.transaction_date < $3`,
      [userId, monthStart, nextMonthStart]
    );

    let totalIncome = 0;
    let totalExpenses = 0;
    rows.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.transaction_type === 'income') totalIncome += amt;
      else if (t.transaction_type === 'expense') totalExpenses += amt;
  });

    res.json({
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactions: rows.length,
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
};

exports.budget = async (req, res) =>
{
    try {
    const { userId } = req.user;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const budgetResult = await db.query(
      `SELECT COALESCE(SUM(b.amount_limit), 0) AS total_budget
       FROM budget b
       WHERE b.user_id = $1
         AND b.start_date <= $2
         AND b.end_date >= $2`,
      [userId, monthStart]
    );

    const spentResult = await db.query(
      `SELECT COALESCE(SUM(t.amount), 0) AS total_spent
       FROM transaction t
       JOIN category c ON t.category_id = c.category_id
       WHERE c.user_id = $1
         AND t.transaction_type = 'expense'
         AND t.transaction_date >= $2
         AND t.transaction_date < $3`,
      [userId, monthStart, nextMonthStart]
    );

    const budget = Number(budgetResult.rows[0].total_budget || 0);
    const spent = Number(spentResult.rows[0].total_spent || 0);
    const remaining = budget - spent;
    const percentage = budget > 0 ? (spent / budget) * 100 : 0;

    res.json({
      budget,
      spent,
      remaining,
      percentage: Math.min(percentage, 100),
    });
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    res.status(500).json({ error: 'Failed to fetch budget summary' });
  }
};

exports.categories = async (req, res) =>
{
    try {
    const { userId } = req.user;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { rows } = await db.query(
      `SELECT c.category_name AS name, COALESCE(SUM(t.amount),0) AS total
       FROM transaction t
       JOIN category c ON t.category_id = c.category_id
       JOIN account a ON t.account_id = a.account_id
       WHERE a.user_id = $1
         AND t.transaction_type = 'expense'
         AND t.transaction_date >= $2
         AND t.transaction_date < $3
       GROUP BY c.category_name
       ORDER BY total DESC
       LIMIT 5`,
      [userId, monthStart, nextMonthStart]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}