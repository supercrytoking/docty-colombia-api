var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

/*====Controller Listing============*/

var location = require("../controller/location");

/*=======Routes============ */
router.post('/addLocation', auth, location.addLocation);
router.post('/removeLocation', auth, location.removeLocation);
router.get('/locations', auth, location.locations);
router.post('/location', auth, location.location);
router.post('/locationTimings', auth, location.locationTimings);
router.post('/addAvailablity', auth, location.addAvailablity);
router.post('/my_avalability', auth, location.my_avalability);
router.get('/all_avalability', auth, location.all_avalability);
router.get('/availableTimes', auth, location.availableTimes);
router.get('/userLocationAvalability', auth, location.userLocationAvalability);


module.exports = router;
