var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var offer = require("../controller/offers");

/*=======Routes============ */
router.post('/createOffer', auth, offer.createOffer);
router.get('/getOffer', auth, offer.getOffer);
router.post('/getOfferByUser', auth, offer.getOfferByUser);
router.get('/getOfferList', auth, offer.getOfferList);

router.post('/deleteOffer', auth, offer.deleteOffer);

module.exports = router;
