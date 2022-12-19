var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');

/*====Controller Listing============*/

var customer = require("../controller/customer");
var { uploadTempStorage } = require('../commons/helper');


/*=======Routes============ */
router.post('/add', auth, customer.add);
router.post('/bulk_add', auth, uploadTempStorage, customer.bulkAdd);
router.post('/bulkAdd', auth, uploadTempStorage, customer.bulkAdd);
router.post('/my-customer', auth, customer.mycustomers);
router.post('/my-customer-ex', auth, customer.mycustomersEx);
router.post('/my-failed-upload/:type?', (req, res, next) => {
  req.params = {
    type: 'uploadErrors'
  };
  next();
}, auth, customer.mycustomersEx);
router.post('/my-customer/:id', auth, customer.mycustomer);
router.post('/delete-customer', auth, customer.deleteCustomer);
router.post('/move-docty-patient-to-clinic', auth, customer.moveDoctyPatientToClinic);
router.get('/download-csv/:id', auth, customer.downloadCSV);
router.delete('/remove/:id', auth, customer.remove);
router.post('/failed_Upload_CSV_Data', customer.failedUploadCsvData);
module.exports = router;
