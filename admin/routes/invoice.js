var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var invoice = require("../controller/invoice");

/*=======Routes============ */
router.post('/addInvoice', auth, invoice.addInvoice);
router.post('/invoices', auth, invoice.invoices);
router.post('/invoice', auth, invoice.invoice);
router.post('/invoiceBybooking', auth, invoice.invoiceBybooking);
router.post('/remove', auth, invoice.remove);
router.get('/download-csv', invoice.downloadCSV);
router.get('/invoice-pdf', auth, invoice.downloadPDF);

module.exports = router;
