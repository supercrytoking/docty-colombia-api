var express = require('express');
var router = express.Router();

var covid = require("../controllers/covidAssessment");

/*=======Routes============ */
router.get('/', covid.assessments);
router.get('/:id', covid.assessment);


module.exports = router;