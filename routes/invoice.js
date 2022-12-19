var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var invoice = require("../controller/invoice");

/*=======Routes============ */
router.post('/addInvoice', auth, invoice.addInvoice);
router.get('/invoices', auth, invoice.invoices);
router.get('/invoice-pdf', auth, invoice.downloadPDF);
router.post('/invoice', auth, invoice.invoice);
router.post('/invoiceBybooking', auth, invoice.invoiceBybooking);
router.post('/remove', auth, invoice.remove);

module.exports = router;
