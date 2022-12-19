var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var favorit = require("../controller/favorit");

/*=======Routes============ */
router.get('/my-favorites', auth, favorit.my_favorites);
router.post('/my_favorittens', auth, favorit.my_favorittens);
router.post('/my-favorite', auth, favorit.add_my_favorites);
router.post('/remove-my-favorite', auth, favorit.remove_my_favorites);
router.post('/remove-my-favoritten', auth, favorit.remove_my_favoritten);


module.exports = router;
