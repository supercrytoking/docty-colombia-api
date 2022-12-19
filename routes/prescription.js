var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var prescription = require("../controller/prescription");

/*=======Routes============ */
router.get('/prescriptions', auth, prescription.prescriptions);
router.get('/download-csv', prescription.downloadCSV);
router.get('/download-pdf', auth, prescription.downloadPDF);
router.get('/prescriptionPurpose', prescription.prescriptionPurpose);

router.post('/addPrescription', auth, prescription.addPrescription);
router.post('/updatePrescription', auth, prescription.updatePrescription);
router.post('/prescriptionByReference', auth, prescription.prescriptionByReference);
router.post('/prescriptionNotesByReference', auth, prescription.prescriptionNotesByReference);
router.post('/prescriptionPurposemodify', prescription.prescriptionPurposemodify);


router.post('/addPrescriptionInvoice', auth, prescription.addPrescriptionInvoice);
router.get('/prescription-invoice/:id', auth, prescription.prescriptionInvoice);
router.post('/package', auth, prescription.prescription_package);
router.get('/medicine-delivery-otp/:reference_id', auth, prescription.mdecineDeliveryOtp);

module.exports = router;
