var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/** import Route Classes */
var users = require('./users');
var insurance = require('./insurance-providers');
var departments = require('./departments');
var fileManager = require('./fileManager');
var log = require('./user_audit_log');
var risk_insurere = require('./risk_insurere');
var banks = require('./banks');
var consultationform = require('./consultationform');
var lifestyle = require('./life-style');
var medicalhistory = require('./medical-history');
var healthparams = require('./healthparams');
var clinicCorporateRel = require('./clinicCorporateRel');

/** Routes */

router.use('/users', auth, users);
router.use('/departments', auth, departments);
router.use('/insurance-providers', insurance);
router.use('/file-manager', fileManager);
router.use('/audit', log);
router.use('/risk_insurere', risk_insurere);
router.use('/banks', banks);
router.use('/consultation-form', consultationform);
router.use('/lifestyle', auth, lifestyle);
router.use('/medical-history', auth, medicalhistory);
router.use('/health-params', auth, healthparams);
router.use('/clinic-coporate-relation', auth, clinicCorporateRel);


module.exports = router;