var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var event = require("../controller/event");

/*=======Routes============ */
router.post('/my-event', auth, event.getEvents);
router.post('/setEvent', auth, event.setEvent);
router.post('/update-event-state', auth, event.updateEvent);
router.post('/deleteEvent', auth, event.deleteEvent);


module.exports = router;
