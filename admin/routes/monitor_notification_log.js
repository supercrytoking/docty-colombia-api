var express = require('express');
var router = express.Router();


/*====Controller Listing============*/

var monitor_notification_log = require("../controller/monitor_notification_log");

/*=======Routes============ */
router.post('/', monitor_notification_log.getLogs);
router.post('/updateSeen', monitor_notification_log.updateSeen);


module.exports = router;
