var express = require('express');
var router = express.Router();

var consultation = require("../controllers/consultation");

/*=======Routes============ */
router.get('/', consultation.consultations);
router.post('/save', consultation.saveConsultation);
router.get('/:reference_id', consultation.consultation);


module.exports = router;