var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var auth_user = require("../controller/auth");

/*=======Routes============ */
router.post('/login', auth_user.login);

module.exports = router;
