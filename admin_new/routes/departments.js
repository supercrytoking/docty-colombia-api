var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');

function setRole(req, next, role) {
    req.params.role = role;
    return next();
}

/*====Controller Listing============*/

var departments = require("../controller/departments");


/*=======Routes============ */

router.post('/', auth, departments.departments);


module.exports = router;    