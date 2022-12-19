var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var booking = require("../controllers/booking");

/*=======Routes============ */
router.get('/my-booking/:id', auth, booking.getBookingDetails);
router.post('/status-run', auth, booking.setBookingRunning);



module.exports = router;
