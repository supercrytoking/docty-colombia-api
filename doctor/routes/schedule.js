var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var schedule = require("../controllers/schedule");

/*=======Routes============ */
router.get('/schedule', auth, schedule.getSchedule);
// router.post('/updateSchedule',auth, schedule.updateSchedule);
router.get('/get-my-todays-slot', auth, schedule.getMyTodaysSlot);
router.get('/get-my-pending-support-request', auth, schedule.getMyPendingSupportRequest);
router.get('/get-my-pending-request', auth, schedule.getMyPendingRequest);
router.get('/get-my-upcomming-bookings', auth, schedule.getUpcommingBookings);
router.get('/get-my-past-bookings', auth, schedule.getPastBookings);
router.get('/get-consultation-form', auth, schedule.consultationForm);


module.exports = router;
