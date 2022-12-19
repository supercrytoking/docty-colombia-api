var express = require('express');
var router = express.Router();

var jotform = require("../controllers/jotform");

/*=======Routes============ */
router.get('/', jotform.submissions);
router.get('/save', jotform.saveSubmissions);
router.get('/:submissionID', jotform.submission);



module.exports = router;