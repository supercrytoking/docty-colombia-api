var express = require('express');
var router = express.Router();


/*====Controller Listing============*/

var servicePricing = require("../controller/servicePricing");

/*=======Routes============ */
router.post('/addServicePricing', servicePricing.addServicePricing);
router.post('/updateServicePricing', servicePricing.updateServicePricing);
router.post('/servicePriceList', servicePricing.servicePriceList);
router.get('/removeServicePrice/:id', servicePricing.removeServicePrice);
router.get('/getServiceByPriceId/:id', servicePricing.getServiceByPriceId);


module.exports = router;
