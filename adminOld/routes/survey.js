var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var survey = require("../controller/survey");

/*=======Routes============ */
router.post('/addSurvey', auth, survey.addSurvey);
router.post('/getSurveys', auth, survey.getSurveys);
router.post('/addResponse', auth, survey.addResponse);
router.post('/getUserResponses', auth, survey.getUserResponses);
router.post('/getSurveyResponses', auth, survey.getSurveyResponses);
router.post('/getUserSurveyResponse', auth, survey.getUserSurveyResponse);
router.post('/response', auth, survey.response);

module.exports = router;
