var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

/*====Controller Listing============*/

var admin_address = require("../controller/admin_address");

/*=======Routes============ */
router.post('/addAddress', auth, admin_address.addAddress);
router.post('/updateAddress', auth, admin_address.UpdateAddress);
router.get('/removeAddress/:id', auth, admin_address.removeAddress);
router.post('/getAddressDetailByAdmin', auth, admin_address.getAddressDetailByAdmin);



module.exports = router;
