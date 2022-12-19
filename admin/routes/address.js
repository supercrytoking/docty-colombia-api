var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

/*====Controller Listing============*/

var address = require("../controller/address");
var addresses = require("../controller/addresses");

/*=======Routes============ */
router.post('/addAddress', auth, address.addAddress);
router.post('/updateAddress', auth, address.UpdateAddress);
router.get('/addressList', auth, address.AddressList);
//AddressList
router.get('/removeAddress/:id', auth, address.removeAddress);
router.get('/getAddressDetailById/:id', auth, address.getAddressDetailById);
router.post('/getAddressDetailByUser', auth, address.getAddressDetailByUser);

router.post('/saveAddress', auth, addresses.addAddress);
router.get('/address', auth, addresses.address);
router.post('/familyAddress', auth, addresses.familyAddress);
router.post('/remove', auth, addresses.removeAddress);
router.post('/addUserAddress', auth, addresses.addUserAddress);
router.post('/getUserAddress', auth, addresses.getUserAddress);


module.exports = router;
