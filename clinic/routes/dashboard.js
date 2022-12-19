var express = require('express');
var router = express.Router();


/*====Controller Listing============*/

var dashboard = require("../controllers/dashboard");

/*=======Routes============ */
router.get('/', dashboard.dashboard);
router.post('/', dashboard.dashboard);
router.post('/booking_stastic', dashboard.booking_stastic);


module.exports = router;
