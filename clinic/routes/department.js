var express = require('express');
var router = express.Router();
var { auth } = require('./middleware');


/*====Controller Listing============*/

var department = require("../controllers/department");

/*=======Routes============ */
router.get('/', department.getDepartments);
router.get('/:id', department.getDepartments);
router.post('/', department.getDepartments);
router.get('/specialities', department.getSpecialities);
router.get('/specialities/search', department.specialitiesSearch);
router.get('/specialities/:id', department.getSpecialities);
router.post('/specialities', department.getSpecialities);
router.post('/add-department', department.addDepartment);
router.post('/add-speciality', department.addSpeciality);
router.delete('/delete-department/:id', department.deleteDepartment);
router.delete('/delete-speciality/:id', department.deleteSpeciality);

module.exports = router;
