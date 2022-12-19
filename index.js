var express = require('express');
var router = express.Router();
var { auth } = require('./routes/middleware');

var testRouter = require('./test/testRoute');
var indexRouter = require('./routes/index');
var adminRouter = require('./adminOld/routes/index');
var adminRouter1 = require('./admin_new/routes/index');
var adminNewRouter = require('./admin/routes/index');
var doctorRouter = require('./doctor/routes/index');
var patientRouter = require('./patient/routes/index');
var clinicRouter = require('./clinic/routes/index');
var corporate = require('./corporate/routes/index');
var app = require('./app/routes/index');
var acl = require('./acl/routes/index');
var pharmacy = require('./pharmacy/routes/index');
var wanotif = require('./webhook/wanotif');
var jotform = require('./webhook/jotform');
var wellness = require('./wellness/routes/index');
var publicApi = require('./open-api/routes/index');
var mr = require('./medical-request/route/index');
var { loadCredential } = require('./commons/loadCredential');
loadCredential();

router.use('/', indexRouter);
router.use('/test', testRouter);
router.use('/admin', adminRouter);
router.use('/docty', adminRouter1);
router.use('/admin_new', adminNewRouter);
router.use('/doctor', doctorRouter);
router.use('/patient', patientRouter);
router.use('/clinic', clinicRouter);
router.use('/corporate', corporate);
router.use('/app', app);
router.use('/acl', acl);
router.use('/pharmacy', pharmacy);
router.use('/wellness', wellness);
router.use('/public-api', publicApi);
router.use('/medical-request', mr);

router.get('/wa', wanotif.sendWhatsAppMessage);
router.get('/wa/:domain', wanotif.sendTeamsNotif);
router.post('/webhook/jotform', jotform.jotform);
router.post('/webhook/medicalForm', jotform.medicalForm);

module.exports = router;