var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var google_calendar = require("../controller/google_calendar");

/*=======Routes============ */
router.get('/enable', auth, google_calendar.enable_google_calendar);

router.get('/refresh_token', google_calendar.refresh_token);


module.exports = router;
