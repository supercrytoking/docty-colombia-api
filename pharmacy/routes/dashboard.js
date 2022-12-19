var express = require('express');
var router = express.Router();
var { auth } = require('../../routes/middleware');

/*====Controller Listing============*/

var dashboard = require("../controllers/dashboard");

/*=======Routes============ */

router.get('/', auth, dashboard.dashboard);

module.exports = router;

