var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var professionType = require("../controller/professionType");

/*=======Routes============ */
router.get('/list', professionType.professionTypes);
router.post('/addprofessionType', auth, professionType.addProfessionType);

module.exports = router;
