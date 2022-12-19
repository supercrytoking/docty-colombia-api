var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


var patient = require("../controllers/patient");

router.post('/documents', auth, patient.getPtientDocument);
router.post('/medical-record', auth, patient.getPtientMedicalRecord);
router.get('/dignosys-record/:id', auth, patient.getPatientSymptomsAnalysys);
router.post('/notify-unreachable', auth, patient.notifyUnreachable);


module.exports = router;
