var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

/*====Controller Listing============*/

var coupon_utilisation = require("../controller/coupon_utilisation");

/*=======Routes============ */

router.get('/coupon_utilisations', auth, coupon_utilisation.coupons);
router.post('/coupon_utilisations', auth, coupon_utilisation.coupons);

router.get('/coupon_utilisation/:id', auth, coupon_utilisation.coupon);
router.post('/validate_coupon', auth, coupon_utilisation.validate_coupon);
router.post('/add', auth, coupon_utilisation.add);
router.post('/delete', auth, coupon_utilisation.deleteCoupon);
router.post('/bulk_update', auth, coupon_utilisation.bulkUpdate);
router.get('/download-csv', coupon_utilisation.downloadCSV);

module.exports = router;
