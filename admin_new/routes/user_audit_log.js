var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');

/*====Controller Listing============*/

var log = require("../controller/user_audit_log");


/*=======Routes============ */

router.get('/logs/:user_id', log.getLogs);



module.exports = router;    