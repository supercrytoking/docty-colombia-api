var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

/*====Controller Listing============*/

var admin_user = require("../controller/admin_user");

/*=======Routes============ */
router.post('/add', auth, admin_user.addAdmin);
router.post('/admin-users', auth, admin_user.adminUsers);
router.post('/reviewer-admin-users', auth, admin_user.reviewerAdminUsers);

router.post('/delete-admin-user', auth, admin_user.deleteAdmin);
router.post('/change-password', auth, admin_user.changePassword);

router.get('/download-csv',  admin_user.downloadCSV);

router.post('/add-permission', auth, admin_user.addPermission);
router.post('/delete-permission', auth, admin_user.deletePermission);
router.get('/permission-list', admin_user.permissionList);
router.post('/permission-list', admin_user.permissionListPagination);

router.post('/add-role', auth, admin_user.addRole);
router.post('/delete-role', auth, admin_user.deleteRole);
router.get('/role-list', admin_user.roleList);
router.post('/role-list', admin_user.roleListPagination);

module.exports = router;
