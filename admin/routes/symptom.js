var express = require('express');
var router = express.Router();
var { auth,interceptor } = require('./middleware')


/*====Controller Listing============*/

var symptom = require("../controller/symptom");

/*=======Routes============ */
router.post('/analysis', auth, symptom.addAnalysis);
router.get('/analysis', auth, symptom.allAnalysys);
router.post('/allAnalysis', auth, symptom.allAnalysys);

router.get('/analysis-download-csv', symptom.downloadCSVAnalysis);

router.get('/analysis/:id', auth, symptom.analysys);
router.get('/analysis_patient/:id', auth, symptom.analysys_patient);
router.get('/interview_patient/:id', auth, symptom.interview_patient);
router.get('/interview/:id', auth, symptom.interview);
router.post('/interview', auth, symptom.saveInterview);


module.exports = router;
