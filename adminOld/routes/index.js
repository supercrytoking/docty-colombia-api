var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

var users = require('./users');
var auths = require('./auth');
var survey = require('./survey');
var contract = require('./contract');
var location = require('./location');
var document = require('./document');
var utility = require('./utility');
var review = require('./review');
var activity_log = require('./activity_log');
var translation = require('./translation');
var prescription = require('./prescription')
var consultation_types = require('./consultation_type');
var schedule = require('./schedule');
var insurance = require('./insurance');
var schedule = require('./schedule');
var dropdown = require('./dropdown');
var staticPaages = require('./staticPaages');
var activity_log_template = require('./activity_log_template');
var symptoms = require('./symptoms');
var slider = require('./slider');

router.use('/auth/', auths);
router.use('/users/', users);
router.use('/survey/', survey);
router.use('/contract/', contract);
router.use('/location', auth, location);
router.use('/document', document);
router.use('/utility', utility);
router.use('/review', review);
router.use('/activity_log', activity_log);
router.use('/translation', translation);
router.use('/prescription', prescription);
router.use('/consultation-types', consultation_types);
router.use('/schedule', schedule);
router.use('/insurance', insurance);
router.use('/dropdown', dropdown);
router.use('/static-pages', staticPaages);
router.use('/log-template', activity_log_template);
router.use('/symptoms', symptoms);
router.use('/slider', slider);

module.exports = router;
