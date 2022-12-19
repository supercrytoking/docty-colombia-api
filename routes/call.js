var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

/*====Controller Listing============*/

var call = require("../controller/callController");

/*=======Routes============ */
router.post('/saveCall', auth, call.saveCall);
router.post('/saveMood', auth, call.saveMood);
router.get('/getCalls', auth, call.getCalls);
router.post('/getCall', auth, call.getCall);
router.get('/getCalls/:caller_id', auth, call.getCalls);
router.post('/setCallNotify', auth, call.setCallNotify);
router.get('/checkCall', auth, call.checkCall);
router.post('/saveEmotion', auth, call.saveEmotion);
router.post('/saveEmotionPr', auth, call.saveEmotionPr);
router.post('/getEmotion', auth, call.getEmotion);
router.post('/mood_on_call', auth, call.getMoodOnCall);

module.exports = router;
