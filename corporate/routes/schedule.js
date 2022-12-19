var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');
var { sendSmsOtp } = require('../../commons/helper');


/*====Controller Listing============*/

var schedule = require("../controllers/schedule");

/*=======Routes============ */
router.post('/scheduleOfStaff', auth, schedule.getScheduleOfStaff);
router.post('/getSupportedScheduleOfStaff', auth, schedule.getSupportedScheduleOfStaff);


router.post('/patientScheduledOfStaff', auth, schedule.patientScheduledOfStaff);

router.post('/getUpcommingBookingsOfDoctor', auth, schedule.getUpcommingBookingsOfDoctor);
router.post('/getPendingBookingsOfDoctor', auth, schedule.getPendingBookingsOfDoctor);
router.post('/getPastBookingsOfDoctor', auth, schedule.getPastBookingsOfDoctor);

router.post('/getUpcommingBookingsOfPatient', auth, schedule.getUpcommingBookingsOfPatient);
router.post('/getPendingBookingsOfPatient', auth, schedule.getPendingBookingsOfPatient);
router.post('/getPastBookingsOfPatient', auth, schedule.getPastBookingsOfPatient);

router.post('/transferRequest', auth, schedule.transferScheduleRequest);
router.post('/rejectSchedule', auth, schedule.rejectSchedule);

// router.post('/otp', function(req,res){
//     sendSmsOtp('hello','+919560316581','+12058396791').then(r=>res.json(r)).catch(e=>res.send(`${e}`))
// });


module.exports = router;
