var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var patient = require("../controller/patient");
var medical = require("../controller/medicalConditions");
var lifestyle = require("../controller/life-style");

/*=======Routes============ */
router.post('/createHistory', auth, patient.createHistory);
router.get('/getFullHistory', auth, patient.getFullHistory);
router.post('/history', auth, patient.history);
router.post('/addInsurance', auth, patient.addInsurance);
router.delete('/removeInsurance/:id', auth, patient.removeInsurance);
router.get('/insurances/:user_id?', auth, patient.insurances);
router.post('/insurance', auth, patient.insurance);
router.post('/addMedical', auth, medical.addMedical);
router.get('/medicals', auth, patient.medicals);
router.delete('/delete-medical/:id/:user_id?', auth, medical.deletemedicalPermanent);
router.get('/medicals/:id', auth, medical.medicalsById);

router.post('/familyMedical', auth, medical.medicals);
router.get('/familyMedical', auth, medical.medicals);
router.get('/all-medicals/:user_id?', auth, medical.allMedicals);
router.post('/setMedicalConditionResponse', auth, medical.setMedicalConditionResponse);
router.post('/life-style', auth, medical.setMedicalConditionResponse);
router.get('/getMedicalConditionResponse', auth, medical.getMedicalConditionResponse);
router.get('/getMedicalRecords', auth, medical.getMyMedicalContitions);
router.get('/lifestyle/:user_id?', auth, medical.getMyMedicalContitions);
// new routes
router.post('/medical-history', auth, medical.medicalHistory);
router.get('/medical-history', auth, medical.medicalHistories);
router.get('/medical-history/:class/:user_id?', auth, medical.medicalHistories);
router.get('/medical-history/lab/:user_id?', auth, medical.medicalHistories);
router.delete('/medical-history/:id', auth, medical.deletemedicalHistories);
router.get('/life-style-history/:user_id?', auth, lifestyle.getHistories);
router.delete('/life-style-history/:id/:user_id?', auth, lifestyle.deleteHistory);


module.exports = router;
