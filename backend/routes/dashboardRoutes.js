const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.get('/dashboard/metrics', auth(), ctrl.metrics);
router.get('/dashboard/budget', auth(), ctrl.budget);
router.get('/dashboard/categories', auth(), ctrl.categories);

module.exports = router;