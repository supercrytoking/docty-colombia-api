var express = require('express');
var router = express.Router();
var { auth } = require('../../routes/middleware');

/*====Controller Listing============*/

var network = require("../controllers/network");

/*=======Routes============ */

router.get('/clinics', auth, network.clinics);

module.exports = router;

