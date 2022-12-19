var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var document = require("../controller/documents");

/*=======Routes============ */
router.post('/addDocument', auth, document.addDocument);
router.post('/documents', auth, document.documents);
router.post('/document', auth, document.document);
router.post('/remove', auth, document.remove);

module.exports = router;
