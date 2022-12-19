var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var relationshipType = require("../controller/relationshipType");

/*=======Routes============ */
router.get('/list', auth, relationshipType.relationshipTypes);
router.post('/addrelationshipType', auth, relationshipType.addRelationshipType);

module.exports = router;
