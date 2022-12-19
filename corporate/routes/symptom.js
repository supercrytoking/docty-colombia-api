var express = require('express');
var router = express.Router();
var { auth, interceptor } = require('./middleware')


/*====Controller Listing============*/

var symptom = require("../controllers/symptom");

/*=======Routes============ */
router.post('/analysis', auth, symptom.addAnalysis);
router.get('/analysis', auth, symptom.allAnalysys);
router.get('/analysis/:id', auth, symptom.analysis);
router.post('/get-covid19-symptoms', auth, symptom.getAllCovidResponse);


module.exports = router;
