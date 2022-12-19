var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var medication = require("../controller/medication");

/*=======Routes============ */

router.get('/medications', auth, medication.getMedications);
router.post('/addmedication', auth, medication.addMedication);

router.get('/slots', auth, medication.getMedicationSlots)
router.get('/conditions', auth, medication.getMedicationConditions)
router.get('/types', auth, medication.getMedicationTypes)
router.get('/durations', auth, medication.getMedicationDurations)

router.post('/addMedicationCondition', auth, medication.addMedicationCondition)
router.post('/addMedicationDuration', auth, medication.addMedicationDuration)
router.post('/addMedicationSlot', auth, medication.addMedicationSlot)
router.post('/addMedicationType', auth, medication.addMedicationType)

module.exports = router;
