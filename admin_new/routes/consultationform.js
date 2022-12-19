var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var consultationForm = require("../controller/consultationForm");


/*=======Routes============ */

router.post('/create', auth, consultationForm.create);
router.post('/activate', auth, consultationForm.activateForm);
router.post('/deactivate', auth, consultationForm.deactivateForm);
router.get('/forms', auth, consultationForm.getAllCLinicForms);
router.get('/forms/:clinicId', auth, consultationForm.getClinicForms);
router.get('/submissions/:formId?', auth, consultationForm.submissions);


module.exports = router;    