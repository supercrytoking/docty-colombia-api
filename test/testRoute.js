var express = require('express');
var router = express.Router();

/*====Controller Listing============*/

var c = require("./testController");

router.get('/', c.test);
router.post('/', c.test);
router.post('/webpush', c.webpush);


module.exports = router;
