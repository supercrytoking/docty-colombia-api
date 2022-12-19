var express = require('express');
var router = express.Router();
var { auth,interceptor } = require('./middleware')


/*====Controller Listing============*/

var symptom = require("../controller/symptom");

/*=======Routes============ */
router.post('/analysis', auth, symptom.addAnalysis);
router.get('/analysis', interceptor, symptom.allAnalysys);
router.get('/analysis/:id', interceptor, symptom.analysys);
router.get('/analysis/:id/:email', interceptor, symptom.analysys);
router.get('/analysis/:id/:family/:email', interceptor, symptom.analysys);
router.get('/analysis_patient/:id', interceptor, symptom.analysys_patient);
router.get('/interview_patient/:id', interceptor, symptom.interview_patient);
router.get('/interview/:id', interceptor, symptom.interview);
router.post('/interview', auth, symptom.saveInterview);


module.exports = router;
