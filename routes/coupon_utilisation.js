var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')
var { uploadTempStorage } = require('../commons/helper')

/*====Controller Listing============*/

var coupon_utilisation = require("../controller/coupon_utilisation");

/*=======Routes============ */

router.get('/coupon_utilisations', auth, coupon_utilisation.coupons);
router.get('/coupon_utilisation/:id', auth, coupon_utilisation.coupon);
router.post('/add', auth, coupon_utilisation.add);
router.post('/bulk_add', auth, uploadTempStorage, coupon_utilisation.bulk_add);
router.post('/delete', auth, coupon_utilisation.deleteCoupon);
router.post('/validate_coupon', auth, coupon_utilisation.validate_coupon);
router.get('/download-csv/:id', coupon_utilisation.downloadCSV);

module.exports = router;
