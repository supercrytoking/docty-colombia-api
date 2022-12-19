var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

var schedule = require('./schedule');
var user = require('./user');
var dashboard = require('./dashboard');
var covid = require('./covid');
var ca = require('./clinicAssoc');

router.use('/schedule', auth, schedule);
router.use('/user', auth, user);
router.use('/dashboard', auth, dashboard);
router.use('/covid', auth, covid);
router.use('/clinic-assoc', auth, ca);


module.exports = router;