var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var utility = require("../controller/utility");
var dynamicForm = require("../controller/dynamicForm");
var cred = require("../controller/credential");
var emailTemp = require("../controller/emailTemplate");
var emailTrigger = require("../controller/emailTrigger");
var emailAutomation = require("../controller/emailAutomation");
var emailShortcode = require("../controller/emailShortcode");
var smsTemp = require("../controller/smsTemplate");
var smsTrigger = require("../controller/smsTrigger");
var smsAutomation = require("../controller/smsAutomation");
var smsshortcode = require("../controller/SMSShortcode");
/*=======Routes============ */
router.post('/addDepartment', auth, utility.addDepartment);
router.post('/deleteDepartment', auth, utility.deleteDepartment);
router.post('/addSpeciality', utility.addSpeciality);
router.post('/deleteSpeciality', auth, utility.deleteSpeciality);
router.post('/addCounsellingType', auth, utility.addCounsellingType);
router.post('/deleteCounsellingType', auth, utility.deleteCounsellingType);
router.post('/addSlot', auth, utility.addSlot);
router.post('/addPricing', auth, utility.addPricing);
router.post('/deletePricing', auth, utility.deletePricing);
router.get('/getDepartments', utility.getDepartments);
router.get('/getSpecialities', utility.getSpecialities);
router.get('/getCounselling_types', utility.getCounsellingTypes);
router.get('/getSlots', auth, utility.getSlots);
router.get('/getPricings', auth, utility.getPricings);

router.post('/uploadSymbol', auth, utility.uploadSymbol);
router.post('/addMedicalQuestion', auth, dynamicForm.addMedicalQuestion);
router.get('/gddMedicalQuestion', auth, dynamicForm.getMedicalContitions);
router.post('/deleteMedicalQuestion', auth, dynamicForm.deleteMedicalQuestion);

router.post('/addEmailConversation', auth, utility.addEmailConversation);
router.post('/addEmailNotification', auth, utility.addEmailNotification);

router.get('/getEmailConversation', auth, utility.getEmailConversation);

/** Specialist */
router.put('/update-specialities/:id', auth, utility.updateSpecialist);
router.delete('/delete-specialities/:id', auth, utility.deleteSpecialist);



/** Medical condition */
router.get('/get-medication-condition', auth, utility.getMedicationCondition);
router.post('/add-medication-condition', auth, utility.addMedicationCondition);
router.put('/update-medication-condition/:id', auth, utility.updateMedicationCondition);
router.delete('/delete-medication-condition/:id', auth, utility.deleteMedicationCondition);

/**chronic condition */
router.get('/get-chronic-condition', auth, utility.getChronicCondition);
router.post('/add-chronic-condition', auth, utility.addChronicCondition);
router.put('/update-chronic-condition/:id', auth, utility.updateChronicCondition);
router.delete('/delete-chronic-condition/:id', auth, utility.deleteChronicCondition);

/**Document type */
router.get('/get-document-type', auth, utility.getDocumentType);
router.post('/add-document-type', auth, utility.addDocumentType);
router.put('/update-document-type/:id', auth, utility.updateDocumentType);
router.delete('/delete-document-type/:id', auth, utility.deleteDocumentType);


/** Education type */
router.get('/get-education-type', auth, utility.getEducationType);
router.post('/add-education-type', auth, utility.addEducationType);
router.put('/update-education-type/:id', auth, utility.updateEducationType);
router.delete('/delete-education-type/:id', auth, utility.deleteEducationType);

/** Allergy */
router.get('/get-allergies', auth, utility.getAllergies);
router.post('/add-allergies', auth, utility.addAllergies);
router.put('/update-allergies/:id', auth, utility.updateAllergies);
router.delete('/delete-allergies/:id', auth, utility.deleteAllergies);


/** surgeries */
router.get('/get-surgery-type', auth, utility.getSurgery);
router.post('/add-surgery-type', auth, utility.addSurgery);
router.put('/update-surgery-type/:id', auth, utility.updateSurgery);
router.delete('/delete-surgery-type/:id', auth, utility.deleteSurgery);

/** Ethnicity type */
router.get('/get-ethnicity-type', auth, utility.getEthnicityType);
router.post('/add-ethnicity-type', auth, utility.addEthnicityType);
router.put('/update-ethnicity-type/:id', auth, utility.updateEthnicityType);
router.delete('/delete-ethnicity-type/:id', auth, utility.deleteEthnicityType);

/** Profession type */
router.get('/get-profession-type', auth, utility.getProfessionType);
router.post('/add-profession-type', auth, utility.addProfessionType);
router.put('/update-profession-type/:id', auth, utility.updateProfessionType);
router.delete('/delete-profession-type/:id', auth, utility.deleteProfessionType);

/** Relationship type */
router.get('/get-relationship-type', auth, utility.getRelationshipType);
router.post('/add-relationship-type', auth, utility.addRelationshipType);
router.put('/update-relationship-type/:id', auth, utility.updateRelationshipType);
router.delete('/delete-relationship-type/:id', auth, utility.deleteRelationshipType);

/** contracts */
router.get('/get-contract-type', auth, utility.getContractType);
router.post('/add-contract-type', auth, utility.addcontract);
router.put('/update-contract-type/:id', auth, utility.updatecontract);
router.delete('/delete-contract-type/:id', auth, utility.deletecontract);

/**contracts template */
router.get('/get-contract-templates', auth, utility.getTemplates);
router.get('/get-contract-template/:id', auth, utility.getTemplate);
router.get('/get-contract-shortcodes', auth, utility.getContractShortcodes);

router.post('/update-contract-shortcode', auth, utility.updateContractShortcode);
router.post('/delete-contract-shortcode', auth, utility.deleteContractShortcode);

router.get('/get-contract-footer-templates', utility.contract_footer_template);
router.get('/get-contract-footer-template/:id', utility.contract_footer_template);

router.post('/add-contract-templates', auth, utility.addTemplates);
router.put('/update-contract-templates/:id', auth, utility.updateTemplates);
router.get('/publish-contract-templates/:id', auth, utility.publishTemplates);
router.delete('/delete-contract-templates/:id', auth, utility.deleteTemplates);
router.post('/sendContract', auth, utility.sendContract);
/**Contract tracks */
router.get('/get-contract-tracks', auth, utility.getContrackTracks);
router.get('/get-contract-track/:id', auth, utility.getContrackTrack);
router.put('/update-contract-tracks/:id', auth, utility.updateContrackTrack);
router.delete('/delete-contract-tracks/:id', auth, utility.deleteContrackTracks);


/** credential api */
router.get('/credentials', auth, cred.credentials);
router.post('/credential', auth, cred.addCred);

/** CRM - email template */
router.get('/templates', auth, emailTemp.templates);
router.get('/template/:id', auth, emailTemp.template);
router.post('/template', auth, emailTemp.addTemplate);
router.post('/updateTemplate', auth, emailTemp.updateTemplate);
router.post('/deleteTemplate', auth, emailTemp.deleteTemplate);

/** CRM - email trigger */
router.get('/triggers', auth, emailTrigger.triggers);
router.get('/triggers_email', auth, emailTrigger.triggers_email);
router.get('/trigger/:id', auth, emailTrigger.trigger);
router.get('/trigger_csv_export', auth, emailTrigger.triggerExport);//No Auth
router.post('/trigger', auth, emailTrigger.addTrigger);
router.post('/updateTrigger', auth, emailTrigger.updateTrigger);

//fcm message
router.get('/triggers_push', auth, emailTrigger.triggers_push);
router.post('/updateTriggerPushNotification', auth, emailTrigger.updateTriggerPushNotification);
router.post('/removeTriggerPushNotification', auth, emailTrigger.removeTriggerPushNotification);

//monitor notification
router.get('/triggers_monitor_notification', auth, emailTrigger.triggers_monitor_notification);
router.post('/updateTriggerMonitorNotification', auth, emailTrigger.updateTriggerMonitorNotification);
router.post('/removeTriggerMonitorNotification', auth, emailTrigger.removeTriggerMonitorNotification);




router.post('/deleteTrigger', auth, emailTrigger.deleteTrigger);
router.post('/testTrigger', auth, emailTrigger.testTrigger);


/** CRM - email automation */
router.get('/automations', auth, emailAutomation.automations);
router.get('/automation/:id', auth, emailAutomation.automation);
router.post('/automation', auth, emailAutomation.addAutomation);
router.post('/updateAutomation', auth, emailAutomation.updateAutomation);
router.post('/deleteAutomation', auth, emailAutomation.deleteAutomation);

/** CRM - email shortcode */
router.get('/shortcodes', auth, emailShortcode.shortcodes);
router.get('/shortcode/:id', auth, emailShortcode.shortcode);
router.post('/shortcode', auth, emailShortcode.addShortcode);
router.post('/updateShortcode', auth, emailShortcode.updateShortcode);
router.post('/deleteShortcode', auth, emailShortcode.deleteShortcode);


/** CRM - sms template */

router.get('/smstemplates', auth, smsTemp.list);
router.get('/smstemplates/:id', auth, smsTemp.get);
router.post('/smstemplates', auth, smsTemp.create);
router.put('/smstemplates/:id', auth, smsTemp.update);
router.delete('/smstemplates/:id', auth, smsTemp.delete);


/** CRM - sms trigger */
router.get('/smstrigger', auth, smsTrigger.list);
router.get('/smstrigger/:id', auth, smsTrigger.get);
router.post('/smstrigger', auth, smsTrigger.create);
router.put('/smstrigger/:id', auth, smsTrigger.update);
router.delete('/smstrigger/:id', auth, smsTrigger.delete);

/** CRM - sms automation */
router.get('/smsautomations', auth, smsAutomation.list);
router.get('/smsautomations/:id', auth, smsAutomation.get);
router.post('/smsautomations', auth, smsAutomation.create);
router.put('/smsautomations/:id', auth, smsAutomation.update);
router.delete('/smsautomations/:id', auth, smsAutomation.delete);

/** CRM - sms shortcode */
router.get('/smsshortcode', auth, smsshortcode.list);
router.get('/smsshortcode/:id', auth, smsshortcode.get);
router.post('/smsshortcode', auth, smsshortcode.create);
router.put('/smsshortcode/:id', auth, smsshortcode.update);
router.delete('/smsshortcode/:id', auth, smsshortcode.delete);

module.exports = router;
