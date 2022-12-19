var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');

/*====Controller Listing============*/

var pharmacy = require("../controllers/pharmacy");

/*=======Routes============ */
router.get('/my-pharmacies', auth, pharmacy.getMyPharmas);
router.get('/my-pharmacies/:type', auth, pharmacy.getMyPharmas);
router.get('/my-pharmacy/:pharmacy_id', auth, pharmacy.getMyPharma);
router.post('/add-pharmacies', auth, pharmacy.addPharmacy);
router.delete('/delete-pharmacy/:pharmacy_id', auth, pharmacy.delete);


module.exports = router;
