var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');

function setRole(req, next, role) {
    req.params.role = role;
    return next();
}

/*====Controller Listing============*/

var insurance = require("../controller/insurance-providers");


/*=======Routes============ */

router.post('/', auth, insurance.InsuranceProviders);
router.get('/download-csv', insurance.downloadCSV);

router.post('/save', auth, insurance.addProvider);
router.post('/bulkUpdate', auth, insurance.bulkUpdate);
router.post('/delete', auth, insurance.deleteProvider);

module.exports = router;    