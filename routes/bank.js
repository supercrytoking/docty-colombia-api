var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var bank = require("../controller/bank");

/*=======Routes============ */
router.post('/save', auth, bank.addBank);
router.get('/get', auth, bank.getBank);


module.exports = router;
