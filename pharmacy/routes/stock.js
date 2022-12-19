var express = require('express');
var router = express.Router();
var { auth } = require('../../routes/middleware');
var { uploadTempStorage } = require('../../commons/helper');

/*====Controller Listing============*/

var stock = require("../controllers/stock");

/*=======Routes============ */

router.get('/', auth, stock.stocks);
router.post('/store', auth, stock.store);
router.post('/store/bulk', auth, uploadTempStorage, stock.bulkAddMedicine);

module.exports = router;

