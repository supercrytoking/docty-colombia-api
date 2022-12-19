var express = require('express');
var router = express.Router();

var network = require('./network');
var stock = require('./stock');
var dashboard = require('./dashboard');

router.use('/network', network);
router.use('/stock', stock);
router.use('/dashboard', dashboard);

module.exports = router;
