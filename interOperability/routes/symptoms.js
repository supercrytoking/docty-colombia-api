var express = require('express');
var router = express.Router();

var symptoms = require("../controllers/symptoms");

/*=======Routes============ */
router.get('/', symptoms.assessments);
router.get('/active', symptoms.assessments);
router.get('/inactive', symptoms.assessments);
router.get('/:id', symptoms.assessment);



module.exports = router;