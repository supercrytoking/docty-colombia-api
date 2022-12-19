var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

var dashboard = require('./dashboard');

var schedule = require('./schedule');
var patient = require('./patient');
var booking = require('./booking');
var procedure = require('./procedure');

router.use('/dashboard', auth, dashboard);

router.use('/schedule', auth, schedule);
router.use('/patient', auth, patient);
router.use('/booking', auth, booking);
router.use('/procedure', auth, procedure);


module.exports = router;
