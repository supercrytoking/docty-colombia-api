var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var {
    getDropdownType,
    saveDropdownType,
    deleteDropdownType,
    getDropdowns,
    saveDropdown
} = require("../controller/dropdown");

/*=======Routes============ */
router.get('/dropdown-type', getDropdownType);
router.post('/dropdown-type', saveDropdownType);
// router.put('/dropdown-type/:id', updateDropdownType);
router.delete('/dropdown-type/:id', deleteDropdownType);


router.get('/dropdowns', getDropdowns);
router.post('/dropdown', saveDropdown);

module.exports = router;
