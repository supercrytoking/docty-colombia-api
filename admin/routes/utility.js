var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var utility = require("../controller/utility");
var vidyo = require("../../videoCall/generateToken");
var agora = require("../../videoCall/agoraToken");
var medical = require("../controller/medicalConditions");
var { upload } = require('../../commons/helper')

/*=======Routes============ */
router.get('/country-list', utility.getCountryList);
router.post('/add-country', utility.addCountry);
router.post('/add-state', utility.addState);
router.post('/add-city', utility.addCity);
router.post('/delete-country', utility.deleteCountry);
router.post('/delete-state', utility.deleteState);
router.post('/delete-city', utility.deleteCity);

router.post('/bulk-update-country-status', utility.bulkUpdateCountryStatus);
router.get('/state-list/:country?', utility.getStateList);
router.post('/search-city', utility.searchCityList);
router.post('/getCountry', utility.getCountry);
router.post('/getState', utility.getState);
router.post('/getCity', utility.getCity);


router.get('/insurence-providers', utility.InsuranceProviders);
router.get('/insurence-benifits', utility.InsuranceBenifits);
router.post('/uploadDocs', auth, utility.uploadDocs);
router.post('/uploadImage', auth, utility.uploadImage);
router.post('/get-vidyo-token', vidyo.getToken);
router.post('/get-agora-token', agora.getToken);

router.post('/get-councelling-id', utility.getCouncelingId);
router.post('/add-billing', utility.addCounsellingBilling);
// router.post('/remove-billing', utility.removeCounsellingBilling);
router.post('/get-billing', utility.getCounsellingBilling);
// router.post('/add-document', utility.addCounsellingDocument);
// router.post('/remove-document', utility.removeCounsellingDocument);
router.post('/get-document', utility.getCounsellingDocument);

router.get('/get-departments', utility.getDepartments);
router.post('/add-department', utility.addDepartment);
router.post('/delete-department', utility.deleteDepartment);
router.post('/bulk-update-department', utility.bulkUpdateDepartment);
router.post('/bulk-add-department', upload, utility.bulkAddDepartment);
router.get('/download-csv-departments', utility.downloadCSVDepartment);

router.get('/get-specialities', utility.getSpecialities);
router.post('/get-specialities', utility.getSpecialities);
router.post('/add-speciality', utility.addSpeciality);
router.post('/delete-speciality', utility.deleteSpeciality);
router.post('/bulk-update-speciality', utility.bulkUpdateSpeciality);
router.post('/bulk-add-speciality', upload, utility.bulkAddSpeciality);
router.get('/download-csv-specialities', utility.downloadCSVSpeciality);

router.get('/get-counselling_types', utility.getCounsellingTypes);
router.get('/get-slots', utility.getSlots);
router.get('/get-pricings', utility.getPricings);
router.get('/get-medical-questionaries', medical.getMedicalContitions);
router.get('/get-medical-questionaries/:question_name', medical.getMedicalContitionQuestion);

router.post('/get-service-price', utility.getServicePrice);
router.get('/get-all-providers', utility.getAllProviders);

router.post('/addAllergy', utility.addAllergy);
router.get('/getAllergies', utility.getAllergies);
// router.post('/addSurgery', utility.addSurgery);
router.get('/getSurgeries', utility.getSurgeries);
// router.post('/addMedicalCondition', utility.addMedicalCondition);
router.get('/getMedicalConditions', utility.getMedicalConditions);


router.get('/get-contract-template/:id', utility.getTemplate);
router.get('/page/:code', utility.getStaticPage);
router.get('/dropdowns', utility.getDropdowns);
router.get('/dropdowns/:types', utility.getDropdowns);

router.get('/getEmailConversation', utility.getEmailConversation);
router.post('/send-email', utility.send_Email);
router.post('/test-job', utility.testJobs);

module.exports = router;
