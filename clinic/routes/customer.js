var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var customer = require("../controllers/customer");

/*=======Routes============ */
router.post('/my-customers', customer.myCustomers);
// router.post('/my-corporate-customers', customer.myCustomers);
router.post('/heatmap-data', customer.heatmapData);
router.post('/my_favorittens', customer.myCustomers);
router.post('/my_docty_patients', customer.myCustomers);
router.post('/my-failed-upload', customer.failedUpload);
router.get('/families/:user_id', customer.families);
router.post('/secondary-patients', customer.secondaryUsers);
router.get('/corporates', customer.corporates);

module.exports = router;