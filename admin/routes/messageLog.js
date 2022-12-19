var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var messageLog = require("../controller/messageLog");

/*=======Routes============ */
router.post('/addMessageLog', auth, messageLog.addMessageLog);
router.get('/messageLogs', auth, messageLog.messageLogs);
router.post('/getMessageReference', auth, messageLog.getMessageReference);

router.post('/messageLogsOfUser', auth, messageLog.messageLogsOfUser);
router.post('/messageLogsOfAdmin', auth, messageLog.messageLogsOfAdmin);

router.post('/messageLogSeen', auth, messageLog.messageLogSeen);

router.post('/messageLog', auth, messageLog.messageLog);
router.post('/remove', auth, messageLog.remove);

module.exports = router;
