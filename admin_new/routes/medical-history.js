var express = require("express");
var router = express.Router();
var { auth } = require("./middleware");

function setRole(req, next, role) {
  req.params.role = role;
  return next();
}

/*====Controller Listing============*/

var medicalhistory = require("../controller/medicalhistory");

/*=======Routes============ */

router.get("/", medicalhistory.medicalHistories);
router.get("/:class", medicalhistory.medicalHistories);
router.post("", medicalhistory.medicalHistory);
router.delete("/:id", medicalhistory.deletemedicalHistories);
module.exports = router;
