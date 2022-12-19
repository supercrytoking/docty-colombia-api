var express = require('express');
var router = express.Router();
var { auth, interceptor } = require('./middleware');


/*====Controller Listing============*/

var search = require("../controllers/search");

/*=======Routes============ */
router.post('/', auth, search.search);
router.post('/a', interceptor, search.search);
router.get('/', auth, search.search);
// router.post('/verify-otp', interceptor, user.verifyOtp);

module.exports = router;
