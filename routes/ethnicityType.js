var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var ethnicityType = require("../controller/ethnicityType");

/*=======Routes============ */
router.get('/list', ethnicityType.ethnicityTypes);
router.post('/addethnicityType', auth, ethnicityType.addEthnicityType);

module.exports = router;
