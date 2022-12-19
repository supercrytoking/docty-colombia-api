var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');
var { sendSmsOtp } = require('../../commons/helper');
const json2xls = require('json2xls');


/*====Controller Listing============*/

var internal = require("../controllers/internal");

/*=======Routes============ */
router.get('/integrations', auth, internal.getHisIntegrations);
router.post('/integration', auth, internal.addHis);
router.delete('/integration/:id', auth, internal.deleteHis);
router.get('/sync/:id', auth, internal.syncRequest);



module.exports = router;
