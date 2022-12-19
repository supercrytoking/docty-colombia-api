var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var educationType = require("../controller/educationType");

/*=======Routes============ */
router.get('/list', educationType.educationTypes);
router.post('/addeducationType', auth, educationType.addEducationType);

module.exports = router;
