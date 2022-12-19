var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var files = require("../commons/fileupload");

/*=======Routes============ */
router.post('/upload', files.uploadFile);
router.post('/uploadBase64', files.uploadBase64);


module.exports = router;
