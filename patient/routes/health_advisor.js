var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var health_advisor = require("../controllers/health_advisor");

/*=======Routes============ */
router.get('/', auth, health_advisor.getAdvisors);
router.post('/remove', auth, health_advisor.removeAdvisor);
router.post('/access', auth, health_advisor.toggleAccess);
// router.get('/requests', auth, health_advisor.advisorRequests);
router.post('/approve', auth, health_advisor.approveAdvisor);



module.exports = router;
