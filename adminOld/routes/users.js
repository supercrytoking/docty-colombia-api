var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var user = require("../controller/user");
var family = require("../controller/family");
var prof = require('../controller/professional');
var Service = require("../controller/service");
var Servpricingice = require("../controller/pricing");

/*=======Routes============ */
router.post('/addUser', auth, user.addUser);
router.post('/deleteUser', auth, user.deleteUser);
router.post('/getUsers', auth, user.getUsers);
router.post('/updateUser', auth, user.updateUserInfo);
router.post('/updateStatus', auth, user.updateStatus);

router.post('/addFamily', auth, family.addFamily);
router.post('/removeFamily', auth, family.removeFamily);
router.post('/families', auth, family.families);
router.post('/family', auth, family.family);
router.post('/familyImage', auth, family.uploadImage);

router.post('/getUserAvailability', auth, user.getUserAvailability);
router.post('/allowAccess', auth, family.allowAccess);

router.post('/addInsurance', auth, user.addInsurance);
router.post('/removeInsurance', auth, user.removeInsurance);
router.post('/insurances', auth, user.insurances);
router.post('/insurance', auth, user.insurance);
router.post('/getMemberInsurance', auth, user.getMemberInsurance);
router.post('/addMedical', auth, user.addMedical);
router.post('/medicals', auth, user.medicals);

router.post('/addEducation', auth, prof.addEducation);
router.post('/updateEducation', auth, prof.updateEducation);

router.post('/educations', auth, prof.educations);
router.post('/education', auth, prof.education);
router.post('/addPractice', auth, prof.addPractice);
router.post('/practices', auth, prof.practices);
router.post('/practice', auth, prof.practice);
router.post('/addLicense', auth, prof.addLicense);
router.post('/licenses', auth, prof.licenses);
router.post('/license', auth, prof.license);
router.post('/remove-professianal-details', auth, prof.remove);
router.post('/professional-doc-upload', auth, prof.uploadDoc);

router.post('/addService', auth, Service.addService);
router.post('/updateService', auth, Service.updateService);

router.post('/removeService', auth, Service.removeService);
router.post('/services', auth, Service.services);
router.post('/service', auth, Service.service);

router.post('/addPricing', auth, Servpricingice.addService);
router.post('/removePricing', auth, Servpricingice.removeService);
router.post('/pricings', auth, Servpricingice.services);
router.post('/pricing', auth, Servpricingice.service);


module.exports = router;
