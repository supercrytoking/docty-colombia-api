var express = require('express');
var router = express.Router();
var { auth, checkClosedEnv } = require('./middleware');
var { sendSmsOtp } = require('../../commons/helper');


/*====Controller Listing============*/

var advisoryAccess = require("../controllers/advisoryAccess");

/*=======Routes============ */
router.post('/request', auth, advisoryAccess.advisoyRequest);

// router.post('/otp', function(req,res){
//     sendSmsOtp('hello','+919560316581','+12058396791').then(r=>res.json(r)).catch(e=>res.send(`${e}`))
// });


module.exports = router;
