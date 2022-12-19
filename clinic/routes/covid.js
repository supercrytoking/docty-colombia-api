var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');
var { sendSmsOtp } = require('../../commons/helper');


/*====Controller Listing============*/

var covid = require("../controllers/covid");

/*=======Routes============ */
router.post('/change-status', covid.changeStatus);

module.exports = router;