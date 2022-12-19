var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');
var { sendSmsOtp } = require('../../commons/helper');


/*====Controller Listing============*/

var tagging = require("../controllers/tagging");

/*=======Routes============ */
router.post('/tag-user', auth, tagging.tagUser);
router.get('/tag-list', auth, tagging.taglist);
router.post('/add-tag', auth, tagging.addtag);
router.post('/remove-tag', auth, tagging.removetag);

module.exports = router;
