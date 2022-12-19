var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');
var { sendSmsOtp } = require('../../commons/helper');


/*====Controller Listing============*/

var insurance_provider = require("../controllers/insurance_provider");

/*=======Routes============ */
router.get('/', insurance_provider.getProviders);
router.get('/:id', insurance_provider.getProviders);
router.post('/', insurance_provider.getProviders);
router.post('/add-provider', insurance_provider.addProvider);
router.delete('/delete-provider/:id', insurance_provider.deleteProvider);

// router.post('/otp', function(req,res){
//     sendSmsOtp('hello','+919560316581','+12058396791').then(r=>res.json(r)).catch(e=>res.send(`${e}`))
// });


module.exports = router;
