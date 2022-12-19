var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')


/*====Controller Listing============*/

var staticPages = require("../controller/staticPages");

/*=======Routes============ */
router.get('/pages', auth, staticPages.getPages);
router.get('/pages/:page_code', auth, staticPages.getPages);
router.get('/page-types', auth, staticPages.getPageTypes);
router.post('/page-types', auth, staticPages.savePageTypes);
router.delete('/page-types/:id', auth, staticPages.deletePageTypes);
router.get('/page-details/:id', auth, staticPages.getPage);
router.post('/save-page', auth, staticPages.savePage);
router.get('/publish/:id', auth, staticPages.publish)
router.delete('/delete-page/:id', auth, staticPages.deletePage)


module.exports = router;
