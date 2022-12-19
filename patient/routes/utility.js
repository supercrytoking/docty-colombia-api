var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var utility = require("../controllers/utility");

/*=======Routes============ */
router.post('/symptom-checker-interview', auth, utility.infermediacaInterview);
router.get('/service-prices/:id', utility.servicePricing);
router.post('/speciality-list', auth, utility.specialityList);


module.exports = router;
