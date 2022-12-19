var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

var auths = require('./auth');
var users = require('./users');
var admin_users = require('./admin_users');
var associate = require('./associate');
var schedule = require('./schedule');
var prescription = require('./prescription');
var utility = require('./utility');
var service = require('./service');

var address = require('./address');
var admin_address = require('./admin_address');
var location = require('./location');
var symptom = require('./symptom');
var invoice = require('./invoice');
var medicine = require('./medicine');
var diagnostic = require('./diagnostic');
var procedimiento = require('./procedimiento');
var booking = require('./booking');
var review = require('./review');
var messageLog = require('./messageLog');
var profile_reviewer = require('./profile_reviewer');
var coupon_utilisation = require('./coupon_utilisation');
var offer = require('./offer');

var patient = require('./patient');
var document = require('./document');

var insurance_provider = require('./insurance_provider');
var covid = require('./covid');
var signedContract = require('./signedContract');
var dashboard = require('./dashboard');
var clinic = require('./clinic');
var monitor_notification_log = require('./monitor_notification_log');




router.use('/auth/', auths);
router.use('/user/', auth, users);
router.use('/admin-user/', auth, admin_users);

router.use('/associate/', auth, associate);
router.use('/address', auth, address);
router.use('/admin_address', auth, admin_address);

router.use('/location', auth, location);
router.use('/schedule', auth, schedule);
router.use('/prescription', auth, prescription);
router.use('/service', auth, service);
router.use('/symptom', auth, symptom);
router.use('/utility', auth, utility);
router.use('/invoice', auth, invoice);
router.use('/medicine', auth, medicine);
router.use('/coupon_utilisation', coupon_utilisation)
router.use('/diagnostic', auth, diagnostic);
router.use('/procedure', auth, procedimiento);
router.use('/booking', auth, booking)
router.use('/review', auth, review)
router.use('/messageLog', auth, messageLog);
router.use('/profile_reviewer', auth, profile_reviewer);
router.use('/patient', auth, patient);
router.use('/document', auth, document);
router.use('/offer', auth, offer);
router.use('/insurance_provider', auth, insurance_provider);
router.use('/covid', auth, covid);
router.use('/signedContract', auth, signedContract);
router.use('/dashboard', auth, dashboard);
router.use('/clinic', auth, clinic);
router.use('/monitor_notification_log', auth, monitor_notification_log);


module.exports = router;
