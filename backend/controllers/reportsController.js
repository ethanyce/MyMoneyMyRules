const db = require('../config/db');

exports.getMonthlyReport = async (req, res) => {
    try {
        const { userId } = req.user;
        const { month, year } = req.query;
        const targetYear = Number(year) || new Date().getFullYear();
        const targetMonth = Number(month) || new Date().getMonth() + 1;

        const start = new Date(targetYear, targetMonth - 1, 1);
        const end = new Date(targetYear, targetMonth, 1);

        const { rows } = await db.query(
            `SELECT t.amount,
                t.transaction_type,
                t.transaction_date,
                c.category_name
            FROM transaction t
            JOIN account a ON t.account_id = a.account_id
            LEFT JOIN category c ON t.category_id = c.category_id
            WHERE a.user_id = $1
                AND t.transaction_date >= $2
                AND t.transaction_date < $3`,
        [userId, start, end]
        );

        let income = 0;
        let expenses = 0;
        const categoryTotals = {};
        const dailyTrend = {};

        rows.forEach((t) => {
        const amt = Number(t.amount || 0);
        if (t.transaction_type === 'income') income += amt;
        if (t.transaction_type === 'expense') {
            expenses += amt;
            const cat = t.category_name || 'Uncategorized';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
            const day = new Date(t.transaction_date).getDate();
            dailyTrend[day] = (dailyTrend[day] || 0) + amt;
            }
        });

        res.json({
        income,
        expenses,
        netBalance: income - expenses,
        transactions: rows.length,
        categories: Object.entries(categoryTotals).map(([name, total]) => ({
            name,
            total,
        })),
        dailyTrend: Object.entries(dailyTrend).map(([day, amount]) => ({
            day: Number(day),
            amount,
            })),
        });
    } catch (error) {
        console.error('Error fetching monthly reports:', error);
        res.status(500).json({ error: 'Failed to fetch monthly reports' });
    }
}

exports.getYearlyReport = async (req, res) => {
    try {
        const { userId } = req.user;
        const { year } = req.query;
        const targetYear = Number(year) || new Date().getFullYear();

        const start = new Date(targetYear, 0, 1);
        const end = new Date(targetYear + 1, 0, 1);

        const { rows } = await db.query(
        `SELECT t.amount,
            t.transaction_type,
            t.transaction_date
        FROM transaction t
        JOIN account a ON t.account_id = a.account_id
        WHERE a.user_id = $1
            AND t.transaction_date >= $2
            AND t.transaction_date < $3`,
        [userId, start, end]
        );

        const income = Array(12).fill(0);
        const expenses = Array(12).fill(0);

        rows.forEach((t) => {
        const month = new Date(t.transaction_date).getMonth();
        const amt = Number(t.amount || 0);
        if (t.transaction_type === 'income') income[month] += amt;
            else if (t.transaction_type === 'expense') expenses[month] += amt;
        });

        res.json({ income, expenses });
    } catch (error) {
        console.error('Error fetching yearly reports:', error);
        res.status(500).json({ error: 'Failed to fetch yearly reports' });
    }
}