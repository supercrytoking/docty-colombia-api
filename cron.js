var express = require('express');
var router = express.Router();

var { getUsers } = require('./scripts/familyMigrate');



router.get('/familyMigrate', getUsers);

module.exports = router;
