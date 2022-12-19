var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var review = require("../../controller/review");

/*=======Routes============ */
router.post('/addReview', auth, review.addReview);
router.post('/getPatientReviews', auth, review.getPatientReviews);
router.post('/getDoctorReviews', auth, review.getDoctorReviews);
router.post('/review', auth, review.review);
router.post('/my-provider-review', auth, review.myReviewToProvider);


module.exports = router;
