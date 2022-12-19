var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var survey = require("../controller/survey");

/*=======Routes============ */
router.post('/getSurvey', auth, survey.getSurvey);
router.post('/addResponse', auth, survey.addResponse);
router.get('/getUserResponses', auth, survey.getUserResponses);
router.post('/getSurveyResponses', auth, survey.getSurveyResponses);
router.post('/getUserSurveyResponse', auth, survey.getUserSurveyResponse);
router.post('/response', auth, survey.response);

module.exports = router;
