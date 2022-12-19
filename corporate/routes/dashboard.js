var express = require('express');
var router = express.Router();


/*====Controller Listing============*/

var dashboard = require("../controllers/dashboard");

/*=======Routes============ */
router.get('/', dashboard.dashboard);
router.post('/', dashboard.dashboard);
router.post('/send-assessment-request', dashboard.sendAssessmentRequest);
// router.get('/', dashboard.snap);


module.exports = router;
