var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var messageLog = require("../controller/messageLog");

/*=======Routes============ */
router.post('/addMessageLog', auth, messageLog.addMessageLog);
router.get('/messageLogs', auth, messageLog.messageLogs);
router.post('/getMessageReference', auth, messageLog.getMessageReference);
router.post('/messageLogsOfUserWithReference', auth, messageLog.messageLogsOfUserWithReference);

router.post('/messageLogsOfUser', auth, messageLog.messageLogsOfUser);
router.post('/messageLogsBetweenTwoUser', auth, messageLog.messageLogsBetweenTwoUser);

router.post('/messageLogsWithUserId', auth, messageLog.messageLogsWithUserId); // staff message log list

router.post('/messageLogsOfReviewer', auth, messageLog.messageLogsOfReviewer);

router.post('/messageLogSeen', auth, messageLog.messageLogSeen);

router.post('/messageLog', auth, messageLog.messageLog);
router.post('/remove', auth, messageLog.remove);

router.get('/unreadCount', auth, messageLog.unreadCount);
router.get('/getNewMessage', auth, messageLog.getNewMessage);
router.get('/messangers', auth, messageLog.myMessangers);
router.get('/chatmates', auth, messageLog.mychatmates);


module.exports = router;
