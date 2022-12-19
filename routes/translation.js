var express = require('express');
var router = express.Router();


/*====Controller Listing============*/

var translation = require("../adminOld/controller/translation");

/*=======Routes============ */
router.get('/getSections', translation.getSections);
router.get('/getTranslations', translation.getTranslations);
router.get('/getTranslations/:section', translation.translations);

module.exports = router;
