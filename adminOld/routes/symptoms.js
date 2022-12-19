var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var symptoms = require("../controller/symptoms");

/*=======Routes============ */
router.post('/getUserSymptoms', auth, symptoms.getUserSymptoms);

module.exports = router;
