var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var contractType = require("../controller/contractType");

/*=======Routes============ */
router.get('/list', contractType.contractTypes);
router.post('/addContractType', auth, contractType.addContractType);

module.exports = router;