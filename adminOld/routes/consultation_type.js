var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

var consultation_types = require("../controller/consultation_types");

router.post('/save-type', auth, consultation_types.setType);
router.get('/get-cunsultation-type', auth, consultation_types.getConsultationtype);
router.post('/get-cunsultation-type-details', auth, consultation_types.getConsultationtypeDetails);

module.exports = router;
