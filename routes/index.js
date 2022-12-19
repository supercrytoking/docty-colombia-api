var { interceptor } = require('./middleware');


var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');
var usersRouter = require('./users');
var utility = require('./utility');
var usersAddress = require('./address');
var servicePricing = require('./servicePricing');
var location = require('./location');
var patient = require('./patient');
var survey = require('./survey');
var service = require('./service');
var document = require('./document');
var symptom = require('./symptom');
var contract = require('./contract');
var call = require('./call');
var schedule = require('./schedule');
var review = require('./review');
var messageLog = require('./messageLog');
var associate = require('./associate');
var offer = require('./offer');
var activity_log = require('./activity_log');
var translation = require('./translation');
var gps_location = require('./gps_location');
var favorit = require('./favorit');
var medication = require('./medication');
var medicine = require('./medicine');
var diagnostic = require('./diagnostic');
var prescription = require('./prescription');
var documentType = require('./documentType');
var educationType = require('./educationType');
var ethnicityType = require('./ethnicityType');
var professionType = require('./professionType');
var relationshipType = require('./relationshipType');
var signedContract = require('./signedContract');
var educationContent = require('./educationContent');
var educationCategory = require('./educationCategory');
var consultation_type = require('./consultation_type');
var payment = require('./payment');
var coupon_utilisation = require('./coupon_utilisation');
var invoice = require('./invoice');
var customer = require('./customer');
var credential = require('./credential');
var notification = require('./notification');
var aws = require('./aws');
var risk_insurere = require('./risk_insurere');
var tnc = require('./tnc');
var bank = require('./bank');
var socket_io = require('./socket_io');
var google_calendar = require('./google_calendar');
var event = require('./event');
var interceptorClass = require('./interceptor');


// Models.sequelize.sync({
//     alter: true,
//     // freezeTableName: true
// }).then(() => {
//     console.log('database schema has been syncronized...')
// })
/*=======Routes============ */
// router.use('/', (r,res)=>{res.send('Docty.ai')});
router.use('/users/', usersRouter);
router.use('/user', usersRouter);
router.use('/utility/', interceptor, utility);
router.use('/address', auth, usersAddress);
router.use('/servicePricing', servicePricing);
router.use('/location', auth, location);
router.use('/patient', patient);
router.use('/survey', survey);
router.use('/service', service);
router.use('/document', document);
router.use('/symptom', symptom);
router.use('/contract', contract);
router.use('/call', call);
router.use('/schedule', schedule);
router.use('/review', review);
router.use('/messageLog', messageLog);
router.use('/associate', associate);
router.use('/offer', offer);
router.use('/activity_log', activity_log);
router.use('/translation', translation);
router.use('/gps_location', gps_location);
router.use('/favorit', favorit);
router.use('/medication', medication);
router.use('/medicine', medicine);
router.use('/diagnostic', diagnostic);
router.use('/prescription', prescription);
router.use('/documentType', documentType);
router.use('/education', educationType);
router.use('/ethnicity', ethnicityType);
router.use('/profession', professionType);
router.use('/relationship', relationshipType);
router.use('/signedContract', signedContract);
router.use('/educationContents', educationContent);
router.use('/educationCategories', educationCategory);
router.use('/consultation-type', consultation_type);
router.use('/payment', payment);
router.use('/coupon_utilisation', coupon_utilisation);
router.use('/invoice', invoice);
router.use('/customer', customer);
router.use('/credential', credential);
router.use('/notification', notification);
router.use('/aws', aws);
router.use('/risk_insurere', risk_insurere);
router.use('/tnc', tnc);
router.use('/bank', bank);
router.use('/socket_io', socket_io);
router.use('/google_calendar', google_calendar);
router.use('/event', event);
router.use('/interceptor', interceptorClass);

module.exports = router;
