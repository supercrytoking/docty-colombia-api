var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var booking = require("../controllers/booking");

/*=======Routes============ */
router.get('/my-booking/:id', auth, booking.getBookingDetails);
router.post('/update-payment', auth, booking.updatePayment);
router.post('/insurance-releafe', auth, booking.insuranceReleafe);
router.post('/status-run', auth, booking.setBookingRunning);
router.post('/billing-details', auth, booking.billingDetails);
router.post('/disconnected-report', auth, booking.disconnectedReport);



module.exports = router;
