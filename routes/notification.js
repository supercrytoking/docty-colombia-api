var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');

var notification = require('../controller/notification');

router.post('/register-device', auth, notification.registerDevice);
router.post('/register-fcm-token', auth, notification.registerFcmToken);


module.exports = router;