var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var corporate = require("../controllers/corporate");

/*=======Routes============ */
router.post('/save', auth, corporate.save);
router.post('/search', auth, corporate.searchCorporate);
router.post('/remove', auth, corporate.removeCorporate);



module.exports = router;
