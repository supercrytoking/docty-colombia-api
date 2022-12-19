var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====controller Listing============*/

var emailTemp = require("../controllers/crm/emailTemplate");
var emailTrigger = require("../controllers/crm/emailTrigger");
var adminEmailTrigger = require("../../adminOld/controller/emailTrigger");

var emailAutomation = require("../controllers/crm/emailAutomation");

var emailConversation = require("../controllers/crm/emailConversation");

var smsTemp = require("../controllers/crm/smsTemplate");
var smsTrigger = require("../controllers/crm/smsTrigger");
var smsAutomation = require("../controllers/crm/smsAutomation");


/*=======Routes============ */

/** CRM - email template */
router.get('/templates', auth, emailTemp.templates);
router.get('/template/:id', auth, emailTemp.template);
router.post('/template', auth, emailTemp.addTemplate);
router.post('/updateTemplate', auth, emailTemp.updateTemplate);
router.post('/deleteTemplate', auth, emailTemp.deleteTemplate);

/** CRM - email trigger */
router.get('/triggers', auth, emailTrigger.triggers);
router.get('/triggers_email', auth, emailTrigger.triggers_email);
router.get('/triggers_email_global_setting', auth, emailTrigger.triggers_email_global_setting);
router.get('/trigger/:id', auth, emailTrigger.trigger);
router.get('/trigger_csv_export', auth, emailTrigger.triggerExport);//No Auth

//fcm message
router.get('/triggers_push', auth, emailTrigger.triggers_push);

//monitor notification
router.get('/triggers_monitor_notification', auth, emailTrigger.triggers_monitor_notification);

router.post('/testTrigger', auth, adminEmailTrigger.testTrigger);


/** CRM - email automation */
router.get('/automations', auth, emailAutomation.automations);
router.post('/clearAutomation', auth, emailAutomation.clearAutomation);
router.get('/automation/:id', auth, emailAutomation.automation);
router.post('/automation', auth, emailAutomation.addAutomation);
router.post('/updateAutomation', auth, emailAutomation.updateAutomation);

router.get('/email-conversation', auth, emailConversation.emailConversations);

/** CRM - sms template */

router.get('/smstemplates', auth, smsTemp.list);
router.get('/smstemplates/:id', auth, smsTemp.get);
router.post('/smstemplates', auth, smsTemp.create);
router.put('/smstemplates/:id', auth, smsTemp.update);
router.delete('/smstemplates/:id', auth, smsTemp.delete);


/** CRM - sms trigger */
router.get('/smstrigger', auth, smsTrigger.list);
router.get('/smstrigger/:id', auth, smsTrigger.get);
router.post('/testSmsTrigger', auth, smsTrigger.testTrigger);

/** CRM - sms automation */
router.get('/smsautomations', auth, smsAutomation.list);
router.get('/smsautomations/:id', auth, smsAutomation.get);
router.post('/clearSmsAutomation', auth, smsAutomation.clearAutomation);
router.post('/smsautomations', auth, smsAutomation.create);
router.put('/smsautomations/:id', auth, smsAutomation.update);
router.delete('/smsautomations/:id', auth, smsAutomation.delete);

module.exports = router;
