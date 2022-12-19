var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var user = require("../controller/user");
var prof = require('../controller/professional');
var family = require('../controller/family');
var contact = require('../controller/contacts');

/*=======Routes============ */
router.post('/signup', user.userRegistration);
router.post('/signin', user.login);
router.post('/get-user-services', user.getUserServices);

router.get('/user-info', auth, user.userInfo);
router.post('/user-info', auth, user.updateUserInfo);
router.post('/validatePin', user.validatePin);
router.post('/resendOtp', user.resendOtp);
router.post('/check-unique-field', user.checkUniqueField);
router.post('/updateUserProfile', auth, user.updateUserProfile);
router.post('/resetPassword', user.resetPassword);
router.post('/resetTemporaryPassword', user.resetTemporaryPassword);
router.post('/change-password', auth, user.changePassword);

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
router.post('/removeFamily', auth, family.removeFamily);
router.post('/families', auth, family.families);
router.post('/family', auth, family.family);
router.post('/familyImage', auth, family.uploadImage);
router.post('/getUserAvailability', auth, user.getUserAvailability);
router.post('/allowAccess', auth, family.allowAccess);
router.get('/contacts', auth, contact.mycontacts);


router.post('/clinicInfo', auth, user.clinicInfo);
router.post('/staffListOfClinic', auth, user.staffListOfClinic);
router.post('/patientListOfClinic', auth, user.patientListOfClinic);
router.post('/doctorInfo', auth, user.doctorInfo);
router.post('/patientInfo', auth, user.patientInfo);

router.post('/my-providers', auth, contact.myProviders);
router.get('/contactPerticulars', auth, contact.contactPerticulars);

router.post('/getUsers', auth, user.getUsers);
router.get('/getUsers', auth, user.getUsers);
router.post('/getUsersEx', auth, user.getUsersEx);
router.get('/getUsersEx', auth, user.getUsersEx);

router.post('/staffWithScheduleOfClinic', auth, user.staffWithScheduleOfClinic);

router.get('/download-csv',  user.downloadCSV);
router.post('/updateAvailableStatus', auth, user.updateAvailableStatus);
router.post('/unlockUserProfile', auth, user.unlockUserProfile);

router.get('/user-config', auth, user.getUserConfig);
router.post('/update-user-config', auth, user.updateUserConfig);

//resetPassword
//updateUserProfile

/** family otp */
router.post('/send-otp-family-member', auth, family.sendOtp);
router.post('/verify-otp-family-member', auth, family.verifyOtp);

// OTP verification
router.post('/verify-otp', auth, user.verifyOtp);

/* transfer doctor*/
router.post('/transfer-get-otp', auth, user.transferGetOtp);
router.post('/transfer-doctor', auth, user.transferDoctor);
router.post('/transfer-doctor-to-docty', auth, user.transferDoctorToDocty);
router.post('/transfer-patient', auth, user.transferPatient);
router.post('/transfer-patient-to-docty', auth, user.transferPatientToDocty);

// New Booking Support
router.post('/new-booking-get-otp', auth, user.newBookingGetOtp);

// login token generate
router.post('/one-time-login-token-otp', auth, user.oneTimeLoginToken);
router.post('/one-time-login-token-verity', auth, user.verifySuperAdminOtp);
router.post('/one-time-login-token-generate', auth, user.oneTimeTokenGenerate);

router.post('/bulk-login-token-download', auth, user.bulkTokenDownload);
router.get('/time-log/:user_id', auth, user.timeLog);


module.exports = router;
