var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


var procedure = require("../controllers/procedure");

router.get('/favorites', auth, procedure.getProcedures);
router.post('/save-favorites', auth, procedure.saveProcedures);
router.get('/remove/:procedure', auth, procedure.removefavorit);


module.exports = router;
