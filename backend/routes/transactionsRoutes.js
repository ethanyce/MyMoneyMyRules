const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/transactionsController');

router.get('/transactions', auth(), ctrl.getTransactions);
router.get('/transactions/export', auth(), ctrl.exportTransactions);
router.post('/transactions', auth(), ctrl.createTransaction);
router.put('/transactions/:transactionId', auth(), ctrl.updateTransaction);
router.delete('/transactions/:transactionId', auth(), ctrl.deleteTransaction);

module.exports = router;