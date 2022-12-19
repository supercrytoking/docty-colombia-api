var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');

var department = require('./department');
var insurance_providers = require('./insurance_providers');
var company_service = require('./company_service');
var schedule = require('./schedule');
var user = require('./user');
var dashboard = require('./dashboard');
var symptom = require('./symptom');
var invoice = require('./invoice');
var advisoryAccess = require('./advisoryAccess');
var hippa = require('./hippa');
var crm = require('./crm');
var customer = require('./customer');
var interOps = require('./interOps');
var pharmacy = require('./pharmacy');
var tagging = require('./tagging');
var covid = require('./covid');

router.use('/departments', auth, department);
router.use('/insurance_associates', auth, insurance_providers);
router.use('/company_service', auth, company_service);
router.use('/schedule', auth, schedule);
router.use('/user', auth, user);
router.use('/dashboard', auth, dashboard);
router.use('/symptom', auth, symptom);
router.use('/invoice', auth, invoice);
router.use('/advisory-access', auth, advisoryAccess);
router.use('/hippa', auth, hippa);
router.use('/crm', auth, crm);
router.use('/customer', auth, customer);
router.use('/interOps', auth, interOps);
router.use('/pharmacy', auth, pharmacy);
router.use('/tagging', auth, tagging);
router.use('/covid', auth, covid);


module.exports = router;