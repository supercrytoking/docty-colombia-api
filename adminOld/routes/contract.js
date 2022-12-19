var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var contract = require("../controller/contract");

/*=======Routes============ */
router.post('/addContract', auth, contract.addContract);
router.post('/getContracts', auth, contract.getContracts);
router.post('/addUserContract', auth, contract.addUserContract);
router.post('/getUserContracts', auth, contract.getUserContracts);
router.post('/getContractUsers', auth, contract.getContractUsers);
router.post('/getUserContractRow', auth, contract.getUserContractRow);
router.post('/contract', auth, contract.contract);

module.exports = router;
