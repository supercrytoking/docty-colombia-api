var express = require("express");
var router = express.Router();
var { auth } = require("./middleware");

function setRole(req, next, role) {
  req.params.role = role;
  return next();
}

/*====Controller Listing============*/

var lifestyle = require("../controller/life-style");

/*=======Routes============ */

router.get("/history/:user_id", lifestyle.getHistories);
router.get("/history/:user_id/:family_id", lifestyle.getHistories);
router.delete("/history/:id", lifestyle.deleteHistory);
router.delete("/history/:id/:family_id", lifestyle.deleteHistory);
router.get("/current/:user_id/", lifestyle.getMedicalContitions);
router.get("/current/:user_id/:member_id", lifestyle.getMedicalContitions);
router.post("/user-lifestyle", lifestyle.setLifeStyle);
router.post("/family-lifestyle", lifestyle.setFamilyLifeStyle);

module.exports = router;
