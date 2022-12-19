var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var procedure = require("../controller/procedimiento");

/*=======Routes============ */

router.post('/procedures', auth, procedure.getProcedimiento);
router.post('/add-procedure', auth, procedure.addProcedimiento);
router.post('/bulk-Update-procedure', auth, procedure.bulkUpdateProcedimientos);
router.get('/download-csv', procedure.downloadCSV);
router.post('/delete', procedure.deleteProcedure);

module.exports = router;
