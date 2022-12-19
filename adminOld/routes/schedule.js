var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var schedule = require("../controller/schedule");

/*=======Routes============ */
router.get('/schedule',auth, schedule.getSchedule);
router.post('/updateSchedule',auth, schedule.updateSchedule);
router.get('/getScheduleOnlyPatient',auth, schedule.getScheduleOnlyPatient);
router.post('/schedule',auth, schedule.setSchedule);
router.post('/createConstultation',auth, schedule.createBookingForAnanysis);
router.post('/setCalendarEvent',auth, schedule.setCalendarEvent);
router.post('/getCalendarEvents',auth, schedule.getCalendarEvents);
router.post('/deleteCalendarEvent',auth, schedule.deleteCalendarEvent);
router.post('/createBulkEvent',auth, schedule.createBulkEvent);
router.post('/confirmBooking',auth, schedule.confirmBooking);
router.post('/getScheduleByReference',auth, schedule.getScheduleByReference);
router.post('/getScheduleSet',auth, schedule.getScheduleSet);


module.exports = router;
