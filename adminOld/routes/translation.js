var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var translation = require("../controller/translation");

/*=======Routes============ */
router.post('/setSection', auth, translation.setSection);
router.post('/setTranslation', auth, translation.setTranslation);

module.exports = router;
