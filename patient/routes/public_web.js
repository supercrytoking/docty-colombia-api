var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var public_web = require("../controllers/public_web");

/*=======Routes============ */
router.post('/lastReview', public_web.lastReview);
router.post('/topSpecialities', public_web.topSpecialities);



module.exports = router;
