var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var prescription = require("../controller/prescription");

/*=======Routes============ */
router.get('/prescriptions', auth, prescription.prescriptions);
router.post('/addPrescription', auth, prescription.addPrescription);

module.exports = router;
