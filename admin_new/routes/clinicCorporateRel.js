var express = require("express");
var router = express.Router();
var { auth } = require("./middleware");

function setRole(req, next, role) {
    req.params.role = role;
    return next();
}

/*====Controller Listing============*/

var clinicCorporateRelation = require("../controller/clinicCorporateRelation");

/*=======Routes============ */

router.get("/create", clinicCorporateRelation.associate);


module.exports = router;