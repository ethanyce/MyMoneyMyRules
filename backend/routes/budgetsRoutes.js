const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth')
const ctrl = require('../controllers/budgetsController');

router.get('/budgets', auth(), ctrl.getBudget);
router.post('/budgets', auth(), ctrl.createBudget);
router.put('/budgets/:budgetId', auth(), ctrl.updateBudget);
router.delete('/budgets/:budgetId', auth(), ctrl.deleteBudget);
router.get('/budgets/:budgetId/summary', auth(), ctrl.getBudgetSummary);

module.exports = router;