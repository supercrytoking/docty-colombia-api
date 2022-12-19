var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var medicine = require("../controller/medicine");

/*=======Routes============ */

router.post('/medicines', auth, medicine.getMedicines);
router.post('/addmedicine', auth, medicine.addMedicines);
router.get('/dosetypes', auth, medicine.getMedicineDoseTypes);
router.post('/addMedicineDoseType', auth, medicine.addMedicineDoseType)

module.exports = router;
