var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var banks = require("../controller/banks");


/*=======Routes============ */

router.post('/', auth, banks.banks);
router.get('/download-csv', banks.downloadCSV);

router.post('/save', auth, banks.add);
router.post('/bulkUpdate', auth, banks.bulkUpdate);
router.post('/delete', auth, banks.deleteBank);

module.exports = router;    