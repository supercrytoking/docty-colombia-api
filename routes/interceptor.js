var express = require('express');
var router = express.Router();



var interceptor = require("../controller/interceptor");

router.get('/email-read-notify', interceptor.emailReadImage);

module.exports = router;
