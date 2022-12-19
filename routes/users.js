var express = require('express');
var router = express.Router();
var { auth, interceptor } = require('./middleware')


/*====Controller Listing============*/

var user = require("../controller/user");
var prof = require('../controller/professional');
var family = require('../controller/family');
var contact = require('../controller/contacts');
var password = require('../controller/password');
var adminUsers = require('../controller/admin_user');
var general = require('../controller/general');
var profile = require('../controller/profile');

/*=======Routes============ */
router.post('/signup', interceptor, user.userRegistration);
router.post('/signin', interceptor, user.login);
router.post('/logout', auth, user.logout);
router.post('/get-user-services', interceptor, user.getUserServices);

router.post('/updateStatus', auth, user.updateStatus);
router.post('/updateStatusBulk', auth, user.updateStatusBulk);


router.get('/user-info', auth, user.userInfo);

router.post('/login-with-token', auth, user.userInfo);

router.post('/user-info', auth, user.updateUserInfo);
router.post('/user-info/emailCheck', user.userInfoEmailCheck);

router.get('/user-config', auth, user.getUserConfig);
router.post('/update-user-config', auth, user.updateUserConfig);

router.post('/updateSignatureBase64', auth, user.updateSignatureBase64);
router.post('/validatePin', user.validatePin);
router.post('/resendOtp', user.resendOtp);
router.post('/profileChangeOtp', auth, user.profileChangeOtp);
router.post('/updateUserWithAudit', auth, user.updateUserWithAudit);

router.post('/check-unique-field', user.checkUniqueField);
router.post('/updateUserProfile', auth, user.updateUserProfile);
router.post('/resetPassword', auth, user.resetPassword);
router.post('/addEducation', auth, prof.addEducation);
router.post('/addUserEducation', auth, prof.addUserEducation);

router.get('/educations', auth, prof.educations);
router.post('/education', auth, prof.education);
router.post('/addPractice', auth, prof.addPractice);
router.post('/addUserPractice', auth, prof.addUserPractice);

router.get('/practices', auth, prof.practices);
router.post('/practice', auth, prof.practice);
router.post('/addLicense', auth, prof.addLicense);
router.post('/addUserLicense', auth, prof.addUserLicense);
router.get('/licenses', auth, prof.licenses);
router.post('/license', auth, prof.license);
router.post('/remove-professianal-details', auth, prof.remove);
router.post('/professional-doc-upload', auth, prof.uploadDoc);
router.post('/addFamily', auth, family.addFamily);
router.post('/SubmitFamily', auth, family.SubmitFamily);
router.post('/removeFamily', auth, family.removeFamily);
router.get('/families', auth, family.families);
router.get('/family/:member_id', auth, family.family);
router.post('/familyImage', auth, family.uploadImage);
router.post('/getUserAvailability', auth, user.getUserAvailability);
router.post('/allowAccess', auth, family.allowAccess);
router.post('/permissions', auth, family.setPermissions);
router.post('/emergemcy-contact', auth, family.addEmergencyContact);
router.get('/contacts', auth, contact.mycontacts);
router.post('/my-providers', auth, contact.myProviders);
router.get('/contactPerticulars', auth, contact.contactPerticulars);
router.post('/send-reset-password-request', password.resetPassword);
router.post('/reset-password', password.resetPasswordWithOPT);
router.post('/change-password', auth, password.changePassword);
router.post('/close-account', auth, user.closeAccount);



router.post('/getUsers', auth, user.getUsers);
router.get('/getUsers', auth, user.getUsers);
router.get('/getUsersEx', auth, user.getUsersEx);
router.post('/getUsersEx', auth, user.getUsersEx);
router.post('/getSupportDoctor', auth, user.getSupportDoctor);
router.get('/getSupportDoctor', auth, user.getSupportDoctor);

router.post('/getUsersNearBy', auth, user.getUsersNearBy);
router.get('/org-contacts/:id', auth, user.org_contactss);

router.post('/staffWithScheduleOfClinic', auth, user.staffWithScheduleOfClinic);

router.post('/updateAvailableStatus', auth, user.updateAvailableStatus);
router.post('/update-lang', auth, user.updateLang);

//Mobile Verification
router.post('/send-otp-phone-verification', user.phone_sendOtp);
router.post('/verify-phone-verification', user.phone_verifyOtp);
router.post('/resend-otp-phone-verification', user.phone_resendOtp);

//resetPassword
//updateUserProfile

/** family otp */
router.post('/send-otp-family-member', auth, family.sendOtp);
router.post('/verify-otp-family-member', auth, family.verifyOtp);
router.post('/clinic-authenticator-change-password', auth, password.clinicAuthenticator_changePassword);
router.post('/unlockUserProfile', auth, user.unlockUserProfile);

//get profile reviewer
router.get('/get-my-reviewer', auth, adminUsers.get_my_reviewer);

//queries
router.get('/stored-queries', auth, general.getStoredQueries);
router.post('/store-query', auth, general.storedQuery);
router.delete('/stored-queries/:id', auth, general.deteteQuery);

router.get('/profile', auth, profile.getProfile);

module.exports = router;
