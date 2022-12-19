var express = require('express');
var router = express.Router();

var invoice = require("../controllers/invoice");

/*=======Routes============ */
router.get('/', invoice.invoices);
router.post('/save', invoice.saveInvoices);
router.get('/:invoice_id', invoice.invoice);



module.exports = router;