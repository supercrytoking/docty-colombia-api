var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var patient = require("../controller/patient");
var medical = require("../controller/medicalConditions");

/*=======Routes============ */
router.post('/createHistory', patient.createHistory);
router.get('/getFullHistory', patient.getFullHistory);
router.post('/history', patient.history);
router.post('/addInsurance', patient.addInsurance);
router.post('/removeInsurance', patient.removeInsurance);
router.get('/insurances', patient.insurances);
router.post('/insurance', patient.insurance);
router.post('/getMemberInsurance', patient.getMemberInsurance);
router.post('/addMedical', patient.addMedical);
router.post('/addFamilyMedical', medical.addFamilyMedical);
router.get('/medicals', patient.medicals);
router.get('/all-medicals', patient.allMedicals);
router.delete('/delete-medical/:id', patient.deletemedicalPermanent);
router.get('/medicals/:id', medical.medicalsById);

router.post('/familyMedical', medical.medicals);
router.get('/all-family-medicals/:member_id', medical.allmedicals);
router.delete('/delete-family-medical/:id', medical.deletemedicalPermanent);
router.post('/setMedicalConditionResponse', medical.setMedicalConditionResponse);
router.get('/getMedicalConditionResponse', medical.getMedicalConditionResponse);
router.post('/setFamilyMedicalConditionResponse', medical.setFamilyMedicalConditionResponse);
router.get('/getFamilyMedicalConditionResponse', medical.getFamilyMedicalConditionResponse);

router.post('/patientInfo', patient.patientInfo);


router.post('/booking-update-payment', patient.bookingUpdatePayment);
router.post('/booking-send-invoice', patient.bookingSendInvoice);

router.post('/insurance-releafe', patient.insuranceReleafe);


module.exports = router;
