var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var review = require("../controller/review");

/*=======Routes============ */
router.post('/addReview', auth, review.addReview);
router.post('/deleteReview', auth, review.deleteReview);
router.post('/getReviews', auth, review.getReviews);
router.post('/review', auth, review.review);

module.exports = router;
