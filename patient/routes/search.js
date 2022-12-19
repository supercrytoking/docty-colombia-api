var express = require('express');
var router = express.Router();
var { interceptor } = require('./middleware');


/*====Controller Listing============*/

var search = require("../controllers/search");

/*=======Routes============ */

router.post('/doctor', interceptor, search.doctor);

module.exports = router;
