var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

var schedule = require('./schedule');
var booking = require('./booking');
var covid = require('./covid');
var corporate = require('./corporate');
var health_advisor = require('./health_advisor');
var utility = require('./utility');
var user = require('./user');
var search = require('./search');
var public_web = require('./public_web');

router.use('/schedule', schedule);
router.use('/booking', booking);
router.use('/covid', covid);
router.use('/corporate', corporate);
router.use('/health_advisors', health_advisor);
router.use('/utility', utility);
router.use('/user', user);
router.use('/search', auth, search);
router.use('/public_web', public_web);



module.exports = router;
