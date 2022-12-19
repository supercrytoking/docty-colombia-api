var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var Service = require("../controller/service");
var Servpricingice = require("../controller/pricing");

/*=======Routes============ */
router.post('/addService', auth, Service.addService);
router.post('/addUserService', auth, Service.addUserService);

router.post('/removeService', auth, Service.removeService);
router.get('/services', auth, Service.services);
router.post('/user_speciality', auth, Service.user_speciality);

router.post('/service', auth, Service.service);

router.post('/addPricing', auth, Servpricingice.addService);
router.post('/removePricing', auth, Servpricingice.removeService);
router.get('/pricings', auth, Servpricingice.services);
router.post('/pricing', auth, Servpricingice.service);


module.exports = router;
