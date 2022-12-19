var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');
var { sendSmsOtp } = require('../../commons/helper');
const json2xls = require('json2xls');


/*====Controller Listing============*/

var hippa = require("../controllers/hippaForm");

/*=======Routes============ */
router.get('/my-form', auth, hippa.myConsultationForm);
router.get('/submissions/:formId', auth, hippa.submissions);
router.get('/downloads', auth, json2xls.middleware, hippa.excels);



module.exports = router;
