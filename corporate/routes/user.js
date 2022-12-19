var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var user = require("../controllers/user");
var professionalDetails = require("../controllers/professionalDetails");

/*=======Routes============ */
router.post('/userInfo', user.userInfo);
router.post('/patientInfo', user.patientInfo);

router.post('/myStaffWithSchedule', user.myStaffWithSchedule);

router.post('/resetTemporaryPassword', user.resetTemporaryPassword);

// OTP verification
router.post('/verify-otp', user.verifyOtp);

// New Booking Support
router.post('/new-booking-get-otp', user.newBookingGetOtp);
router.post('/booking-send-invoice', user.bookingSendInvoice);

// manager
router.post('/add-manager', user.addManager);
router.get('/get-manager-list', user.getManagerList);
router.post('/delete-manager', user.deleteManager);
router.post('/change-password', user.changePassword);


router.get('/professional-details/:userid', professionalDetails.professionalDetails);
router.post('/professional-details', professionalDetails.professionalDetailsSave);
router.get('/designations', professionalDetails.designations);
router.post('/designations', professionalDetails.designationsave);
router.delete('/designations/:id', professionalDetails.designationsdelete);
router.post('/search-user', professionalDetails.searchUser);



module.exports = router;
