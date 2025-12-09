const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth')
const ctrl = require('../controllers/authController');

router.post('/auth/signup', ctrl.signup);
router.post('/auth/login', ctrl.login);

module.exports = router;