var express = require('express');
var router = express.Router();
var { auth, interceptor } = require('./middleware')


/*====Controller Listing============*/

var tnc = require("../controller/tnc");

/*=======Routes============ */
router.get('/get/:role', interceptor, tnc.tncRoleBased);
router.post('/accept', auth, tnc.accept);
router.get('/chat-policy', auth, tnc.chatDesclamer);
router.post('/chat-policy', auth, tnc.acceptChatDesclamer);
router.get('/:code', auth, tnc.checkTnsVersion);


module.exports = router;
