var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var slider = require("../controller/slider");

/*=======Routes============ */
router.post('/add', auth, slider.add);
router.get('/sliders', auth, slider.sliders);
router.get('/slider/:id', auth, slider.sliders);
router.post('/remove', auth, slider.remove);
router.post('/toggleStatus', auth, slider.toggleStatus);
router.post('/toggleGroupStatus', auth, slider.toggleGroupStatus);

module.exports = router;
