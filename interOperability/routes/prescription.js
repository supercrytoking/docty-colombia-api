var express = require('express');
var router = express.Router();

var prescription = require("../controllers/prescription");

/*=======Routes============ */
router.get('/', prescription.prescriptions);
router.post('/save', prescription.savePrecription);
router.get('/:reference_id', prescription.prescription);


module.exports = router;