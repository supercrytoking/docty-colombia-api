var express = require('express');
var router = express.Router();

var insurance = require("../controllers/insurance");

/*=======Routes============ */
router.get('/insurance-provider-list', insurance.insuranceProviders);
router.get('/my-insurance-associates', insurance.insuranceMyAssciates);
router.get('/patient-with-insurance/:id?', insurance.paientWithInsurance);
router.post('/my-insurance-associate', insurance.MyAssciate);
router.post('/patient-update-insurance', insurance.paientUpdateInsurance);


module.exports = router;