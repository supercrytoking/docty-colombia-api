var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

var user = require('./user');
var search = require('./search');

router.use('/user', user);
router.use('/search', search);


module.exports = router;
