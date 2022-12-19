var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var profile_reviewer = require("../controller/profile_reviewer");


/*=======Routes============ */
router.post('/add', auth, profile_reviewer.add);
router.post('/remove', auth, profile_reviewer.remove);

router.get('/assigned-list', auth, profile_reviewer.assignedList);


module.exports = router;
