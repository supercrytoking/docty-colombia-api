var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');

function setRole(req, next, role) {
    req.params.role = role;
    return next();
}

/*====Controller Listing============*/

var fileManager = require("../controller/fileManager");


/*=======Routes============ */

router.post('/get-files', auth, fileManager.getFiles);
router.post('/add-file', auth, fileManager.addFiles);
router.post('/delete-file', auth, fileManager.deleteFiles);


module.exports = router;    