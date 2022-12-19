var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var booking = require("../controller/booking");

/*=======Routes============ */

router.post('/getOngoingBookings', auth, booking.getOngoingBookings);
router.post('/getPendingPrescriptions', auth, booking.getPendingPrescriptions);

router.post('/getPastBookings', auth, booking.getPastBookings);
router.post('/getUpcommingBookings', auth, booking.getUpcommingBookings);
router.post('/getScheduledBookings', auth, booking.getScheduledBookings);
router.post('/refund', auth, booking.refundBooking);

router.get('/:id', auth, booking.getBookingDetails);
router.post('/delete', auth, booking.deleteBooking);

module.exports = router;
