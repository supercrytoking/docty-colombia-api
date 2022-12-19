var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var medicine = require("../controller/medicine");

/*=======Routes============ */

router.post('/medicines', auth, medicine.getMedicines);
router.post('/addmedicine', auth, medicine.addMedicines);
router.post('/bulkUpdateMedicines', auth, medicine.bulkUpdateMedicines);

router.get('/dosetypes', auth, medicine.getMedicineDoseTypes);
router.post('/addMedicineDoseType', auth, medicine.addMedicineDoseType)
router.get('/download-csv', medicine.downloadCSV);
router.post('/delete', medicine.deleteMedicine);

module.exports = router;
