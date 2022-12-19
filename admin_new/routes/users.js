var express = require("express");
var router = express.Router();
var { auth } = require("./middleware");

function setRole(req, next, role) {
  req.params.role = role;
  return next();
}

/*====Controller Listing============*/

var user = require("../controller/user");
var network = require("../controller/networkEnv");
var notify = require("../controller/notifyUsers");

/*=======Routes============ */

router.post(
  "/doctors/:role?",
  (req, res, next) => setRole(req, next, 1),
  user.getUsers
);
router.post(
  "/patients/:role?",
  (req, res, next) => setRole(req, next, 2),
  user.getUsers
);
router.post("/doctors-search", user.getDoctors);
router.post("/patients-search", user.getPatients);
router.post("/patients_search", user.getAllPatients);

router.post(
  "/nurses/:role?",
  (req, res, next) => setRole(req, next, 3),
  user.getUsers
);
router.post(
  "/labs/:role?",
  (req, res, next) => setRole(req, next, 4),
  user.getUsers
);
router.post(
  "/clinics/:role?",
  (req, res, next) => setRole(req, next, 5),
  user.getUsers
);
router.post(
  "/pharmacies/:role?",
  (req, res, next) => setRole(req, next, 6),
  user.getUsers
);
router.post(
  "/corporations/:role?",
  (req, res, next) => setRole(req, next, 13),
  user.getUsers
);
router.post("/approve-user", user.approveUser);
router.post("/dis-approve-user", user.disapproveUser);
router.get("/get-all-disabled-users", user.getAllUnapprovedUser);
router.post("/get-all-disabled-users", user.getAllUnapprovedUser);

router.get("/get-all-pending-users", user.getAllPendingUser);
router.post("/get-all-pending-users", user.getAllPendingUser);

router.post("/approval-review", user.approveDisapproveSections);
router.post("/get-approval-review", user.getApprovalReviewData);
router.get("/get-approval-reviews/:user_id", user.getApprovalReviews);
router.get("/quick-track/:user_id", user.quickTrack);
router.get("/user-finder/:search", user.userFinder);
router.post("/notify-users", notify.sendnotificationUsers);


router.get("/network-environment/:userId", network.getNetworkEnv);
router.post("/network-environment", network.setNetworkEnv);

module.exports = router;
