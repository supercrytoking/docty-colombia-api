var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

/*====Controller Listing============*/

var diagnostic = require("../controller/diagnostic");

/*=======Routes============ */

router.post('/diagnostics', auth, diagnostic.getDiagnostic);
router.post('/adddiagnostic', auth, diagnostic.addDiagnostic);
router.post('/bulkUpdateDiagnostic', auth, diagnostic.bulkUpdateDiagnostic);
router.get('/download-csv', diagnostic.downloadCSV);
router.post('/delete', diagnostic.deleteDiagnostic);
module.exports = router;
