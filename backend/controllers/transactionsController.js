const db = require('../config/db');

exports.getTransactions = async (req, res) => {
    try {
    const { userId } = req.user;
    const { type, category, search, sortBy } = req.query;

    const params = [userId];
    let where = 'a.user_id = $1';

    if (type && type !== 'all') {
      params.push(type);
      where += ` AND t.transaction_type = $${params.length}`;
    }

    if (category && category !== 'all') {
      params.push(category);
      where += ` AND c.category_name = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      where += ` AND (c.category_name ILIKE $${idx} OR t.note ILIKE $${idx})`;
    }

    const orderBy =
      sortBy === 'amount' ? 't.amount DESC' : 't.transaction_date DESC';

    const { rows } = await db.query(
      `SELECT t.transaction_id AS id,
              t.amount,
              t.transaction_type AS type,
              t.transaction_date AS date,
              t.note AS description,
              c.category_name AS category
       FROM transaction t
       JOIN account a ON t.account_id = a.account_id
       LEFT JOIN category c ON t.category_id = c.category_id
       WHERE ${where}
       ORDER BY ${orderBy}`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

exports.exportTransactions = async (req, res) => {
  try {
    const { userId } = req.user;
    const { rows } = await db.query(
      `SELECT t.transaction_id,
              t.transaction_date,
              t.transaction_type,
              t.amount,
              t.note,
              c.category_name,
              a.account_name
       FROM transaction t
       JOIN account a ON t.account_id = a.account_id
       LEFT JOIN category c ON t.category_id = c.category_id
       WHERE a.user_id = $1
       ORDER BY t.transaction_date DESC`,
      [userId]
    );

    const header = [
      'transaction_id',
      'transaction_date',
      'transaction_type',
      'amount',
      'note',
      'category',
      'account',
    ];

    const lines = rows.map((r) =>
      [
        r.transaction_id,
        r.transaction_date.toISOString().slice(0, 10),
        r.transaction_type,
        Number(r.amount || 0).toFixed(2),
        (r.note || '').replace(/"/g, '""'),
        (r.category_name || '').replace(/"/g, '""'),
        (r.account_name || '').replace(/"/g, '""'),
      ]
        .map((v) => `"${v}"`)
        .join(',')
    );

    const csv = [header.join(','), ...lines].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting transactions:', error);
    res.status(500).json({ error: 'Failed to export transactions' });
  }
}

exports.createTransaction = async (req, res) => {
  try {
    const { userId } = req.user;
    const { type, amount, category, description, date } = req.body;
    console.log('Create transaction request:', { userId, type, amount, category, date });

    // For simplicity, use a default account per user (create if missing)
    let account = await db.query(
      'SELECT account_id FROM account WHERE user_id = $1 ORDER BY account_id LIMIT 1',
      [userId]
    );
    if (account.rows.length === 0) {
      account = await db.query(
        `INSERT INTO account (user_id, account_name, account_type, balance)
         VALUES ($1, $2, $3, 0)
         RETURNING account_id`,
        [userId, 'Default Account', 'cash']
      );
    }
    const accountId = account.rows[0].account_id;

    // If the client provided a budget_id, use that budget's category and ensure it's valid
    let categoryId = null;
    if (req.body.budget_id) {
      const budgetRes = await db.query(
        'SELECT budget_id, category_id, start_date, end_date FROM budget WHERE budget_id = $1 AND user_id = $2',
        [req.body.budget_id, userId]
      );
      if (budgetRes.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid budget selected' });
      }
      const budget = budgetRes.rows[0];
      categoryId = budget.category_id;
      // If provided date falls outside the budget period, clamp it to the budget range
      let txDate = new Date(date);
      const startDate = new Date(budget.start_date);
      const endDate = new Date(budget.end_date);
      if (isNaN(txDate.getTime())) txDate = new Date();
      if (txDate < startDate) txDate = startDate;
      if (txDate > endDate) txDate = endDate;
      // overwrite date variable used for insert
      req.body.date = txDate.toISOString().slice(0, 10);
    } else {
      // Ensure category exists. If none provided, use or create an 'Uncategorized' category.
      const categoryName = category && category.trim() ? category : 'Uncategorized';
      let cat = await db.query(
        'SELECT category_id FROM category WHERE user_id = $1 AND category_name = $2',
        [userId, categoryName]
      );
      if (cat.rows.length === 0) {
        cat = await db.query(
          `INSERT INTO category (user_id, category_name, category_type)
           VALUES ($1, $2, $3)
           RETURNING category_id`,
          [userId, categoryName, type === 'income' ? 'income' : 'expense']
        );
      }
      categoryId = cat.rows[0].category_id;
    }

    const insert = await db.query(
      `INSERT INTO transaction (account_id, category_id, amount, transaction_type, transaction_date, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING transaction_id AS id, amount, transaction_type AS type, transaction_date AS date, note AS description`,
      [accountId, categoryId, amount, type, req.body.date || date, description || null]
    );

    console.log('Inserted transaction:', insert.rows[0]);

    // If this transaction was attached to a budget, log the new spent total for that budget
    if (req.body.budget_id) {
      try {
        const budgetCheck = await db.query(
          'SELECT start_date, end_date, category_id FROM budget WHERE budget_id = $1 AND user_id = $2',
          [req.body.budget_id, userId]
        );
        if (budgetCheck.rows.length > 0) {
          const b = budgetCheck.rows[0];
          const spentRes = await db.query(
            `SELECT COALESCE(SUM(t.amount),0) AS spent
             FROM transaction t
             WHERE t.category_id = $1
               AND t.transaction_type = 'expense'
               AND t.transaction_date >= $2
               AND t.transaction_date <= $3`,
            [b.category_id, b.start_date, b.end_date]
          );
          console.log(`Budget ${req.body.budget_id} spent after insert:`, spentRes.rows[0].spent);
        }
      } catch (err) {
        console.error('Error computing budget spent after insert:', err);
      }
    }

    res.status(201).json(insert.rows[0]);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
}

exports.updateTransaction = async (req, res) => {
  const transactionId = req.params.transactionId;
  const userId = req.user.userId;
  const { type, amount, category, description, date } = req.body;

  try {
    // Get account ID belonging to the user (assumes default account)
    let accountRes = await db.query(
      'SELECT account_id FROM account WHERE user_id = $1 ORDER BY account_id LIMIT 1',
      [userId]
    );

    if (accountRes.rows.length === 0) {
      return res.status(400).json({ error: 'No account found for user' });
    }
    const accountId = accountRes.rows[0].account_id;

    // Get or create category
    const categoryName = category && category.trim() ? category : 'Uncategorized';

    let catRes = await db.query(
      'SELECT category_id FROM category WHERE user_id = $1 AND category_name = $2',
      [userId, categoryName]
    );

    let categoryId;
    if (catRes.rows.length === 0) {
      catRes = await db.query(
        `INSERT INTO category (user_id, category_name, category_type)
         VALUES ($1, $2, $3)
         RETURNING category_id`,
        [userId, categoryName, type === 'income' ? 'income' : 'expense']
      );
      categoryId = catRes.rows[0].category_id;
    } else {
      categoryId = catRes.rows[0].category_id;
    }

    // Update the transaction
    const updateRes = await db.query(
      `UPDATE transaction
       SET account_id = $1,
           category_id = $2,
           amount = $3,
           transaction_type = $4,
           transaction_date = $5,
           note = $6
       WHERE transaction_id = $7
       AND account_id IN (SELECT account_id FROM account WHERE user_id = $8)
       RETURNING transaction_id AS id, amount, transaction_type AS type, transaction_date AS date, note AS description`,
      [accountId, categoryId, amount, type, date, description, transactionId, userId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found or unauthorized' });
    }

    res.json(updateRes.rows[0]);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
}

exports.deleteTransaction = async (req, res) => {
  const transactionId = req.params.transactionId;
  const userId = req.user.userId;
  console.log(`User ${userId} requested delete for transaction ${transactionId}`);

  try {
    const deleteRes = await db.query(
      `DELETE FROM transaction
       WHERE transaction_id = $1
         AND account_id IN (SELECT account_id FROM account WHERE user_id = $2)`,
      [transactionId, userId]
    );

    if (deleteRes.rowCount === 0) {
      console.log(`Delete failed: transaction not found or user unauthorized`);
      return res.status(404).json({ error: 'Transaction not found or unauthorized' });
    }

    console.log(`Transaction ${transactionId} deleted successfully`);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
}