var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var covid = require("../controller/covid");

/*=======Routes============ */
router.post('/save-response', auth, covid.addCovidCheckerResponse);
router.post('/get-all-covid-response/:status?', auth, covid.getAllCovidResponse);



module.exports = router;