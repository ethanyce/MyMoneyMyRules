const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/reportsController');

router.get('/reports/monthly', auth(), ctrl.getMonthlyReport);
router.get('/reports/yearly', auth(), ctrl.getYearlyReport);

module.exports = router;