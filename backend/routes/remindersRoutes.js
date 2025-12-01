const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/remindersController');

router.get('/reminders', auth(), ctrl.getReminders);
router.post('/reminders', auth(), ctrl.createReminder);
router.put('/reminders/:reminderId', auth(), ctrl.updateReminder);
router.delete('/reminders/:reminderId', auth(), ctrl.deleteReminder);

module.exports = router;