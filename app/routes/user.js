var express = require('express');
var router = express.Router();
var { auth, interceptor } = require('./middleware');


/*====Controller Listing============*/

var user = require("../controllers/user");

/*=======Routes============ */
router.post('/athenticate', interceptor, user.sendOtp);
router.post('/verify-otp', interceptor, user.verifyOtp);
router.post('/send-otp-for-login', interceptor, user.otpForOtpLogin);
router.post('/verify-otp-for-login', interceptor, user.loginOtpVerify);

module.exports = router;
