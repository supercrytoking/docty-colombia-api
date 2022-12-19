var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var credential = require("../controller/credential");

/*=======Routes============ */
router.get('/get-credentials', auth, credential.getCredentials);

module.exports = router;
