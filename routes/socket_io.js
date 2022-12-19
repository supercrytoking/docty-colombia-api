var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var socket_io = require("../controller/socket_io");

/*=======Routes============ */
// No need auth middleware: this api is called from jobscheduller.
router.post('/checkUserOnline', socket_io.checkOnline);
router.post('/createNotification', socket_io.create_notification);

module.exports = router;