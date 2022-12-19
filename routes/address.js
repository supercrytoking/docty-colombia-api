var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

/*====Controller Listing============*/

var address = require("../controller/address");
var addresses = require("../controller/addresses");

/*=======Routes============ */
router.post('/addAddress', address.addAddress);
router.post('/updateAddress', address.UpdateAddress);
router.get('/addressList', address.AddressList);
//AddressList
router.get('/removeAddress/:id', address.removeAddress);
router.get('/getAddressDetailById/:id', address.getAddressDetailById);
router.post('/getAddressDetailByUser', address.getAddressDetailByUser);

router.post('/saveAddress', auth, addresses.addAddress);
// router.get('/address', auth, addresses.address);
router.get('/address/:user_id?', auth, addresses.address);
router.post('/remove', auth, addresses.removeAddress);
router.post('/addUserAddress', auth, addresses.addUserAddress);
router.post('/getUserAddress', auth, addresses.getUserAddress);


module.exports = router;
