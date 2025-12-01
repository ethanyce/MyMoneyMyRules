const db = require('../config/db');

exports.getReminders = async (req, res) => {
  try {
    const { userId } = req.user;
    const { rows } = await db.query(
      `SELECT reminder_id, title, description, remind_at
       FROM reminders
       WHERE user_id = $1
       ORDER BY remind_at ASC`,
      [userId]
    );

    res.json({ reminders: rows });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
};

exports.createReminder = async (req, res) => {
    try {
        const { userId } = req.user;
        const { title, description, remind_at } = req.body;

        if (!title || !remind_at) {
            return res.status(400).json({ error: 'Title and remind_at are required' });
        }

        const insertResult = await db.query(
            `INSERT INTO reminders (user_id, title, description, remind_at)
             VALUES ($1, $2, $3, $4)
             RETURNING reminder_id, title, description, remind_at`,
            [userId, title, description || null, remind_at]
        );
        const reminder = insertResult.rows[0];

        res.status(201).json({ reminder });
    } catch (error) {
        console.error('Error creating reminder:', error);
        res.status(500).json({ error: 'Failed to create reminder' });
    }
};

exports.updateReminder = async (req, res) => {
  try {
    const { userId } = req.user;
    const { reminderId } = req.params;
    const { title, description, remind_at } = req.body;

    const updateResult = await db.query(
      `UPDATE reminders
       SET title = $1, description = $2, remind_at = $3
       WHERE reminder_id = $4 AND user_id = $5
       RETURNING reminder_id, title, description, remind_at`,
      [title, description, remind_at, reminderId, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const reminder = updateResult.rows[0];
    res.json({ reminder });
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
};

exports.deleteReminder = async (req, res) => {
  try {
    const { userId } = req.user;
    const { reminderId } = req.params;

    const deleteResult = await db.query(
      `DELETE FROM reminders
       WHERE reminder_id = $1 AND user_id = $2
       RETURNING reminder_id`,
      [reminderId, userId]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
}