var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var location = require("../controller/location");

/*=======Routes============ */
router.post('/addLocation', auth, location.addLocation);
router.post('/updateLocation', auth, location.updateLocation);
router.post('/removeLocation', auth, location.removeLocation);
router.post('/locations', auth, location.locations);
router.post('/location', auth, location.location);
router.post('/locationTimings', auth, location.locationTimings);
router.post('/addAvailablity', auth, location.addAvailablity);
router.post('/my_avalability', auth, location.my_avalability);
router.post('/my_all_avalability', auth, location.my_all_avalability);
router.post('/userLocationAvalability', auth, location.userLocationAvalability);


module.exports = router;
