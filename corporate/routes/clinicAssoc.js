var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var ca = require("../controllers/clinic_assoc");

router.get('/clinics', ca.getClinicList);
router.get('/clinic', ca.myClinic);
router.post('/clinic', ca.associate);
router.post('/clinic', ca.associate);
router.get('/sync', ca.resync);


module.exports = router;