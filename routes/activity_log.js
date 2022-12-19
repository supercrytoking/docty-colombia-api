var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var activityLog = require("../controller/activityLog");

/*=======Routes============ */
router.post('/addActivityLog', auth, activityLog.add_activityLog);
router.post('/activityLogs', auth, activityLog.activityLogs);
router.get('/activityLogs', auth, activityLog.activityLogs);
router.post('/activityLog', auth, activityLog.activityLog);
router.post('/remove', auth, activityLog.remove);


module.exports = router;
