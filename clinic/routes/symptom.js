var express = require('express');
var router = express.Router();
var { auth, interceptor } = require('./middleware');


/*====Controller Listing============*/

var symptom = require("../controllers/symptom");

/*=======Routes============ */
router.post('/analysis', auth, symptom.addAnalysis);
router.get('/analysis', auth, symptom.allAnalysys);
router.get('/allAnalysis/:user_id?', auth, symptom.allAnalysys);
router.get('/active-analysis', auth, symptom.getActiveAnalysys);
router.get('/inactive-analysis', auth, symptom.chengedAnalysis);

router.get('/analysis/:id', auth, symptom.analysis);
router.get('/analysis-summary-graph-data', auth, symptom.summaryGraphData);
router.post('/analysis-line-graph-data', auth, symptom.lineGraphData);


router.post('/get-covid19-symptoms/:status?', auth, symptom.getAllCovidResponse);


module.exports = router;