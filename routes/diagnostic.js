var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

/*====Controller Listing============*/

var diagnostic = require("../controller/diagnostic");

/*=======Routes============ */

router.post('/diagnostics', auth, diagnostic.getDiagnostic);
router.post('/adddiagnostic', auth, diagnostic.addDiagnostic);
router.post('/procedures', auth, diagnostic.getProcedures);

module.exports = router;
