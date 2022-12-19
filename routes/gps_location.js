var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var gps_location = require("../controller/gps_location");

/*=======Routes============ */

router.post('/addTrack', auth, gps_location.addTrack);
router.get('/Tracks', auth, gps_location.tracks);
router.post('/removeTracks', auth, gps_location.removeTracks);

router.post('/addLocation', auth, gps_location.addLocation);
router.get('/locations', auth, gps_location.locations);
router.post('/removeLocations', auth, gps_location.removeLocations);
router.post('/google_map_eta', auth, gps_location.google_map_eta);

module.exports = router;
