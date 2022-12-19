var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var dashboard = require("../controllers/dashboard");
var user = require("../controllers/user");
var general = require("../controllers/general");
var engage = require("../controllers/engage");
var subscribers = require("../controllers/subscribers");

/*=======Routes============ */
router.get('/dashboard', auth, dashboard.dashboard);
router.get('/histories/:class?', auth, user.histories);
router.get('/histories/bmi/:user_id', auth, user.bmi);
router.get('/histories/:class/:user_id', auth, user.histories);
router.get('/user-info/:userId?', auth, user.userInfo);
router.get('/clinics', auth, general.getClinicList);
router.get('/users/cronic_condition/:label?', auth, user.cronic_condition);
router.get('/users/:view/:label?', auth, user.users);
router.get('/translations', general.translations);
router.post('/engage', engage.engage);
router.post('/engage/emails', engage.getEmails);
router.post('/engage/sms', engage.getSms);
router.get('/engage/force-to-synce/:id', auth, engage.forceToSync);
router.get('/partners', auth, subscribers.partners);
router.get('/subscribers/:device_type?', auth, subscribers.users);

module.exports = router;
