var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var prescription = require("../controller/prescription");

/*=======Routes============ */
router.get('/prescriptions', auth, prescription.prescriptions);
router.post('/prescriptions', auth, prescription.prescriptions);
router.post('/deletePrescription', auth, prescription.deletePrescription);
router.post('/prescriptionByReference', auth, prescription.prescriptionByReference);
router.post('/prescriptionNotesByReference', auth, prescription.prescriptionNotesByReference);
router.get('/download-csv', prescription.downloadCSV);
router.get('/download-pdf', prescription.downloadPDF);

module.exports = router;
