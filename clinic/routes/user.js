var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');
const json2xls = require('json2xls');


/*====Controller Listing============*/

var user = require("../controllers/user");
var reviewer = require("../controllers/reviewer");
// var doctor = require("../controllers/doctor");

/*=======Routes============ */
router.post('/userInfo', auth, user.userInfo);
router.post('/patientInfo', auth, user.patientInfo);

router.post('/myStaffWithSchedule', auth, user.myStaffWithSchedule);

router.post('/resetTemporaryPassword', user.resetTemporaryPassword);

// OTP verification
router.post('/verify-otp', auth, user.verifyOtp);

// New Booking Support
router.post('/new-booking-get-otp', auth, user.newBookingGetOtp);
router.post('/booking-send-invoice', user.bookingSendInvoice);

// manager
router.post('/add-manager', auth, user.addManager);
router.get('/get-manager-list', auth, user.getManagerList);
router.post('/delete-manager', auth, user.deleteManager);
router.post('/change-password', auth, user.changePassword);
router.get('/get-approval-reviews/:user_id', auth, reviewer.getApprovalReviews);
router.post('/notify-users', auth, user.sendnotificationUsers);
router.get("/user-finder/:search", user.userFinder);
router.get('/time-log/:user_id', auth, user.timeLog);
router.get('/get-api-key', auth, user.getApiKey);
router.get('/get-insurance-customers', auth, user.getInsuranceCustomer);
router.get('/get-insurance-customers/download', auth, json2xls.middleware, user.downloadIC);


module.exports = router;
