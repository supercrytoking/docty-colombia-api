var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var signedContract = require("../controller/signedContract");

/*=======Routes============ */
router.get('/signedContracts', auth, signedContract.signedContracts);
router.get('/getSignedContractByUser', auth, signedContract.getSignedContractByUser);
router.get('/getSignedContractHistoryByUser', auth, signedContract.getSignedContractHistoryByUser);
router.post('/addSignedContract', auth, signedContract.addSignedContract);
router.post('/sendEmailSignedContract', auth, signedContract.sendEmailSignedContract);


module.exports = router;