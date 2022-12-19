var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');
var { sendSmsOtp } = require('../../commons/helper');
const json2xls = require('json2xls');


/*====Controller Listing============*/

var invoice = require("../controllers/invoice");

/*=======Routes============ */
router.get('/invoices', auth, invoice.invoices);
router.get('/download-csv', auth, json2xls.middleware, invoice.downloadCSV);
router.post('/save-settings', auth, invoice.saveSettings);
router.get('/get-settings/:key', auth, invoice.getSettings);

// router.post('/otp', function(req,res){
//     sendSmsOtp('hello','+919560316581','+12058396791').then(r=>res.json(r)).catch(e=>res.send(`${e}`))
// });


module.exports = router;
