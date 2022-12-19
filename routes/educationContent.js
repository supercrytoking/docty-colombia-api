var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var educationContent = require("../controller/educationContent");

/*=======Routes============ */
router.get('/educationContents', auth, educationContent.educationContents);
router.post('/addeducationContent', auth, educationContent.addEducationContent);

module.exports = router;
