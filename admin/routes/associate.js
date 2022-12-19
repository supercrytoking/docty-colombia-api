var express = require('express');
var router = express.Router();
var { auth } = require('./middleware')

/*====Controller Listing============*/

var associate = require("../controller/associate");

/*=======Routes============ */
router.post('/associate', auth, associate.addAssociate);
router.get('/associate/:id', auth, associate.getAssociate);
router.get('/associates', auth, associate.getAssociates);
router.post('/delete-associate/:model', auth, associate.deleteAssociate);
router.post('/education', auth, associate.addEducation);
router.post('/practice', auth, associate.addPractice);
router.post('/license', auth, associate.addLicense);
router.post('/skill', auth, associate.addSkill);

router.post('/my-staff', auth, associate.mystaff);//deprecated
router.post('/get-users', auth, associate.mystaff_Ex);

router.post('/delete-satff', auth, associate.deleteSatff);
router.get('/my-staff-download-csv',  associate.downloadCSV);
module.exports = router;
