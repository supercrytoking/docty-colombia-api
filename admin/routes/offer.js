var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var offer = require("../controller/offers");

/*=======Routes============ */
router.post('/createOffer', offer.createOffer);
router.get('/getOffer', offer.getOffer);
router.post('/getOfferByAdmin', offer.getOfferByAdmin);
router.get('/getOfferList', offer.getOfferList);

router.post('/deleteOffer', offer.deleteOffer);

module.exports = router;
