var express = require('express');
var router = express.Router();
var { auth, interceptor } = require('./middleware')

var consultation_types = require("../controller/consultation_types");

router.get('/get-type', interceptor, consultation_types.getType);

module.exports = router;
