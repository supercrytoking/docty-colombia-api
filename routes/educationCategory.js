var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var educationCategory = require("../controller/educationCategory");

/*=======Routes============ */
router.get('/educationCategories', auth, educationCategory.educationCategories);
router.post('/addEducationCategory', auth, educationCategory.addEducationCategory);

module.exports = router;
