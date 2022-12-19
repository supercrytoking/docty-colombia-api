var express = require('express');
var router = express.Router();


/*====Controller Listing============*/

var insurance_provider = require("../controller/insurance_provider");

router.post('/getPatientListOfInsuranceProvider', insurance_provider.getPatientListOfInsuranceProvider);
router.post('/getClinicListOfInsuranceProvider', insurance_provider.getClinicListOfInsuranceProvider);
router.post('/getClaimsBookingListOfInsuranceProvider', insurance_provider.getClaimsBookingListOfInsuranceProvider);

module.exports = router;
