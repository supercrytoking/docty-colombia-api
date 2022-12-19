var express = require('express');
var router = express.Router();
var { auth } = require('../middleware/index')

var patient = require('./patient');
var invoice = require('./invoice');
var prescription = require('./prescription');
var consultation = require('./consultation');
var covidAssessment = require('./covidAssessment');
var symptoms = require('./symptoms');
var jotform = require('./jotform');
var insurance = require('./insurance');


router.get('/', (req, res) => {
  res.render('index', { title: 'Docty API' });
});
router.use('/patients', auth, patient);
router.use('/invoices', auth, invoice);
router.use('/prescriptions', auth, prescription);
router.use('/consultations', auth, consultation);
router.use('/covid-self-assessments', auth, covidAssessment);
router.use('/self-assessments', auth, symptoms);
router.use('/medical-forms-submissions', auth, jotform);
router.use('/insurance', auth, insurance);

module.exports = router;
