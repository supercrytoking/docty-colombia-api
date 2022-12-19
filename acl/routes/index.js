var express = require('express');
var router = express.Router();

var permissions = require('./permissions');

router.use('/', permissions);

module.exports = router;
