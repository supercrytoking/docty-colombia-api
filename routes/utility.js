var express = require('express');
var router = express.Router();
var { auth, interceptor } = require('./middleware')


/*====Controller Listing============*/

var utility = require("../controller/utility");
var vidyo = require("../videoCall/generateToken");
var agora = require("../videoCall/agoraToken");
var medical = require("../controller/medicalConditions");
var contractType = require('../controller/contractType')
var slider = require('../controller/slider')
var general = require('../controller/general')


/*=======Routes============ */
router.get('/country-list', utility.getCountryList);
router.get('/state-list/:country?', utility.getStateList);
router.post('/search-city', utility.searchCityList);
router.post('/getCountry', utility.getCountry);
router.post('/getState', utility.getState);
router.post('/getCity', utility.getCity);

router.get('/role-list', utility.roleList);
router.get('/insurence-providers', utility.InsuranceProviders);
router.get('/banks', utility.Banks);

router.get('/insurence-benifits', utility.InsuranceBenifits);
router.post('/uploadDocs', auth, utility.uploadDocs);
router.post('/uploadImage', auth, utility.uploadImage);
router.post('/get-vidyo-token', vidyo.getToken);
router.post('/get-agora-token', agora.getToken);
router.post('/get-video-profile', agora.getVideoProfile);

router.post('/agora-token', agora.token);

router.post('/get-councelling-id', utility.getCouncelingId);
router.post('/add-billing', utility.addCounsellingBilling);
// router.post('/remove-billing', utility.removeCounsellingBilling);
router.post('/get-billing', utility.getCounsellingBilling);
// router.post('/add-document', utility.addCounsellingDocument);
// router.post('/remove-document', utility.removeCounsellingDocument);
router.post('/get-document', utility.getCounsellingDocument);

router.get('/get-departments', utility.getDepartments);
router.get('/get-specialities', utility.getSpecialities);
router.post('/get-specialities', utility.getSpecialities);
router.get('/get-counselling_types', utility.getCounsellingTypes);
router.get('/get-slots', utility.getSlots);
router.get('/get-pricings', utility.getPricings);
router.get('/get-medical-questionaries', interceptor, medical.getMedicalContitions);
router.get('/get-medical-questionaries/:question_name', interceptor, medical.getMedicalContitionQuestion);
router.post('/get-service-price', utility.getServicePrice);
router.get('/get-all-providers', utility.getAllProviders);

router.post('/addAllergy', utility.addAllergy);
router.get('/getAllergies', utility.getAllergies);
// router.post('/addSurgery', utility.addSurgery);
router.get('/getSurgeries', utility.getSurgeries);
// router.post('/addMedicalCondition', utility.addMedicalCondition);
router.get('/getMedicalConditions', utility.getMedicalConditions);
router.get('/contract-types', contractType.contractTypes);
router.get('/get-contract-template/:id', interceptor, utility.getTemplate);
router.get('/get-user-contract-template', auth, utility.getUserContractTemplate);
router.get('/check-new-user-contract-template', auth, utility.checkNewUserContractTemplate);

//This api is not use
router.get('/contract_footer_template', utility.contract_footer_template);

router.get('/page/:code', utility.getStaticPage);
router.get('/dropdowns', utility.getDropdowns);
router.get('/dropdowns/:types', utility.getDropdowns);
router.get('/sliders', slider.sliders);

router.get('/getEmailConversation', utility.getEmailConversation);
router.post('/send-email', utility.send_Email);

/**Contract tracks */
router.get('/get-contract-track/:id', utility.getContrackTrack);
router.put('/update-contract-tracks/:id', utility.updateContrackTrack);
router.get('/sugest-dropdown', interceptor, general.autoSuggest);
router.get('/get-my-ip', (req, res) => {
  res.send({
    ip: req.connection.remoteAddress
  })
});


module.exports = router;
