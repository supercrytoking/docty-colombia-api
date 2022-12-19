var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

/*====Controller Listing============*/

var payment = require("../controller/payment");

/*=======Routes============ */
// router.get('/create-transaction', payment.payViaCard);
// router.get('/confirm-transaction', payment.payViaTocken);
// router.get('/create-card', payment.createCard);
// router.get('/get-card/:cardId', payment.getCard);
// router.get('/create-token', payment.createToken);
router.post('/create-payment', auth, payment.payDirectCard);

module.exports = router;
