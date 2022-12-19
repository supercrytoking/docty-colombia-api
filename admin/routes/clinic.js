var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var clinic = require("../controller/clinic");

/*=======Routes============ */
router.post('/company_service', auth, clinic.company_service);



module.exports = router;
