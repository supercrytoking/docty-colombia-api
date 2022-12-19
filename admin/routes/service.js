var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var Service = require("../controller/service");


/*=======Routes============ */
router.post('/addService', auth, Service.addService);
router.post('/addUserService', auth, Service.addUserService);
router.post('/updateUserSpecialityType', auth, Service.updateUserSpecialityType);

router.post('/removeService', auth, Service.removeService);
router.get('/services', auth, Service.services);
router.post('/service', auth, Service.service);


module.exports = router;
