var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var schedule = require("../controller/schedule");

/*=======Routes============ */
router.get('/schedule', auth, schedule.getSchedule);
router.get('/schedule/:id', auth, schedule.getScheduleById);
router.get('/changedSchedule', auth, schedule.getChangedSchedule);
router.post('/schedule', auth, schedule.setSchedule);
router.post('/createConstultation', auth, schedule.createBookingForAnanysis);

router.post('/delete-schedule', auth, schedule.deleteSchedule);
router.get('/download-csv', schedule.downloadCSV);
router.post('/getAvailableSloat', schedule.getAvailableSloat);
router.post('/transferRequest', schedule.transferScheduleRequest);

router.post('/getBookingsOfStaff', auth, schedule.getBookingsOfStaff);

router.post('/getUpcommingBookingsOfDoctor', auth, schedule.getUpcommingBookingsOfDoctor);
router.post('/getPastBookingsOfDoctor', auth, schedule.getPastBookingsOfDoctor);

router.post('/getUpcommingBookingsOfPatient', auth, schedule.getUpcommingBookingsOfPatient);
router.post('/getPendingBookingsOfPatient', auth, schedule.getPendingBookingsOfPatient);
router.post('/getPastBookingsOfPatient', auth, schedule.getPastBookingsOfPatient);

router.post('/setCalendarEvent', auth, schedule.setCalendarEvent);
router.post('/getCalendarEvents', auth, schedule.getCalendarEvents);
router.post('/deleteCalendarEvent', auth, schedule.deleteCalendarEvent);
router.post('/createBulkEvent', auth, schedule.createBulkEvent);
router.post('/cancel-booking', auth, schedule.cancelABooking);
router.post('/billing-details', auth, schedule.billingDetails);



module.exports = router;
