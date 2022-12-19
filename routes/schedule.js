var express = require('express');
var router = express.Router();
var { auth, checkClosedEnv } = require('./middleware');

// middleware


/*====Controller Listing============*/

var schedule = require("../controller/schedule");
const middleware = require('./middleware');

/*=======Routes============ */
router.get('/schedule', auth, schedule.getSchedule);

router.post('/delete-schedule', auth, schedule.deleteSchedule);
router.get('/staff-download-csv', schedule.downloadCSV);

router.get('/schedule/:id', auth, schedule.getScheduleById);
router.get('/emergencyContact/:id', auth, schedule.getEmergencyNo);
router.get('/booking.pdf', auth, schedule.downloadpdf);
router.post('/updateSchedule', auth, schedule.updateSchedule);
router.post('/updateBookingExtras', auth, schedule.setBookingExtras);
router.get('/permitted-schedules/:reference_id', auth, schedule.getPermittedSchedules);
router.post('/acceptSchedule', auth, schedule.acceptSchedule);
router.post('/rejectSchedule', auth, schedule.rejectSchedule);

router.get('/getScheduleOnlyPatient', auth, schedule.getScheduleOnlyPatient);
router.post('/schedule', auth, checkClosedEnv, schedule.setSchedule);
router.post('/createConstultation', auth, checkClosedEnv, schedule.createBookingForAnanysis);
router.post('/createBookingSupport', auth, schedule.createBookingSupport);
router.post('/createConstultationScheduleChangeRequest', auth, schedule.createConstultationScheduleChangeRequest);
router.post('/setCalendarEvent', auth, schedule.setCalendarEvent);
router.post('/getCalendarEvents', auth, schedule.getCalendarEvents);
router.post('/deleteCalendarEvent', auth, schedule.deleteCalendarEvent);
router.post('/createBulkEvent', auth, schedule.createBulkEvent);
router.post('/confirmBooking', auth, schedule.confirmBooking);
router.post('/getScheduleByReference', auth, schedule.getScheduleByReference);
router.post('/getScheduleByDigitToken', auth, schedule.getScheduleByDigitToken);
router.post('/getScheduleSet', auth, schedule.getScheduleSet);
router.post('/getAvailableSloat', schedule.getAvailableSloat);//public?
router.post('/getAvailableSloatOfClinic', auth, schedule.getAvailableSloatOfClinic);



module.exports = router;
