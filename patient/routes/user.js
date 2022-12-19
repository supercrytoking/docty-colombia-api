var express = require('express');
var router = express.Router();
var { interceptor, auth } = require('./middleware');


/*====Controller Listing============*/

var user = require("../controllers/user");
var family = require("../controllers/family");
var wearables = require("../controllers/wearables");

/*=======Routes============ */

router.post('/search', interceptor, user.search);
router.get('/families', family.families);
router.get('/doctor-profile-and-services/:id', interceptor, user.doctorDetails);
router.post('/sync-wearable', auth, wearables.syncWatch);
router.get('/get-wearable-data', auth, wearables.getWatchData);
router.post('/sync-weather', auth, wearables.syncWeather);
router.get('/get-weather', auth, wearables.getWeather);
router.post('/sync-device-status', auth, wearables.syncDeviceStatus);
router.get('/get-device-status', auth, wearables.getDeviceStatus);


module.exports = router;