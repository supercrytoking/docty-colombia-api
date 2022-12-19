var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var covid = require("../controllers/covid");

/*=======Routes============ */
// router.post('/save-response', auth, covid.addCovidCheckerResponse);
router.get('/get-all-covid-response/:user_id', auth, covid.getAllCovidResponse);
router.get('/get-covid-response/:id', auth, covid.getCovidResponse);



module.exports = router;