var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/
var insurance = require("../controller/insurance");

/*=======Routes============ */
router.get('/insurance-providers', auth, insurance.InsuranceProviders);
router.post('/insurance-providers', auth, insurance.InsuranceProviders);
router.post('/insurance-provider', auth, insurance.addProvider);
router.post('/delete-provider', auth, insurance.deleteProvider);
router.get('/insurance-benefits', auth, insurance.InsuranceBenifits);

module.exports = router;
