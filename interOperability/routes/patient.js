var express = require('express');
var router = express.Router();

var patient = require("../controllers/patient");

/*=======Routes============ */
router.get('/customers', patient.getPatients);
router.post('/customers', patient.getPatients);
router.get('/favorittens', patient.getPatients);
router.post('/favorittens', patient.getPatients);
router.get('/docty-customers', patient.getPatients);
router.post('/docty-customers', patient.getPatients);
router.post('/save', patient.savePatient);
router.get('/:id', patient.getPatient);



module.exports = router;