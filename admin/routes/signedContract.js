var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var signedContract = require("../controller/signedContract");

/*=======Routes============ */
router.post('/getSignedContractByUser', auth, signedContract.getSignedContractByUser);
router.get('/getSignedContractByUser', auth, signedContract.getSignedContractByUser);

router.get('/getSignedContractHistoryByUser', auth, signedContract.getSignedContractHistoryByUser);



module.exports = router;