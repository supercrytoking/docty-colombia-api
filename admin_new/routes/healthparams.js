var express = require("express");
var router = express.Router();
var { auth } = require("./middleware");

function setRole(req, next, role) {
  req.params.role = role;
  return next();
}

/*====Controller Listing============*/

var healthParams = require("../controller/healthParams");

/*=======Routes============ */

router.post("/param", healthParams.createParams);
router.get("/params/:class", healthParams.getParams);
router.delete("/params/:id", healthParams.delete);

module.exports = router;
