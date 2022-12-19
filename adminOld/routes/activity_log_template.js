var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var activityLogTemplate = require("../controller/activityLogTemplate");

/*=======Routes============ */
router.post('/addTrigger', auth, activityLogTemplate.addTrigger);
router.post('/updateTrigger', auth, activityLogTemplate.updateTrigger);
router.post('/deleteTrigger', auth, activityLogTemplate.deleteTrigger);
router.get('/triggers', auth, activityLogTemplate.getTriggers);

router.post('/add', auth, activityLogTemplate.add);
router.post('/update', auth, activityLogTemplate.update);
router.post('/delete', auth, activityLogTemplate.delete);

router.get('/logTemplates', auth, activityLogTemplate.logTemplates);

module.exports = router;
