var express = require('express');
var router = express.Router();


/*====Controller Listing============*/

var dashboard = require("../controller/dashboard");

/*=======Routes============ */
router.post('/', dashboard.dashboard);
router.post('/booking_stastic', dashboard.booking_stastic);


module.exports = router;
