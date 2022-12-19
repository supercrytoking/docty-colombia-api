var express = require('express');
var router = express.Router();
var { auth } = require('../../routes/middleware');

/*====Controller Listing============*/

var pm = require("../controllers/permission_modues");

/*=======Routes============ */

router.get('/modules', pm.modules);
router.get('/user-groups', auth, pm.groups);
router.get('/user-group/:id', auth, pm.getGroup);
router.post('/user-group', auth, pm.createGroups);
router.get('/staff-permission/:staff_id', auth, pm.getStaffPermission);
router.post('/staff-permission', auth, pm.setStaffPermission);


module.exports = router;

