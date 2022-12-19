var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var risk_insurere = require("../controller/risk_insurere");

/*=======Routes============ */
router.post('/save', auth, risk_insurere.addInsurance);
router.get('/get', auth, risk_insurere.getInsurance);

module.exports = router;
