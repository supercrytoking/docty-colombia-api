var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var documentType = require("../controller/documentType");

/*=======Routes============ */
router.get('/list', auth, documentType.documentTypes);
router.post('/addDocumentType', auth, documentType.addDocumentType);

module.exports = router;