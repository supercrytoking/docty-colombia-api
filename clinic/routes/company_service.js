var express = require('express');
var router = express.Router();


/*====Controller Listing============*/

var company_service = require("../controllers/company_service");

/*=======Routes============ */
router.get('/', company_service.getServices);
router.get('/:id', company_service.getServices);
router.post('/', company_service.getServices);
router.post('/add', company_service.addService);
router.delete('/delete/:id', company_service.deleteService);


module.exports = router;
