const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

var getStaffIDList = async (clinic_id, serviceWhere) => {
  try {
    var staffIdList = [];
    var myStaff = await db.user.findAll({
      include: [{
        model: db.user_role,
        as: 'user_role',
        where: {
          role_id: { [Op.in]: [1, 3] }//doctor & nurse
        }
      },
      {
        model: db.associate,
        as: 'associate',
        where: { user_id: clinic_id }
      },
      {
        model: db.user_service,
        as: 'services',
        where: serviceWhere,
        include: ['speciality', 'department']
      },
      ]
    });

    if (myStaff) {
      myStaff = myStaff.filter(u => {
        var d = u.services.filter(us => (us.speciality || {}).role_id == u.speciality_type && (us.department || {}).role_id == u.speciality_type);
        return d.length > 0;
      });
      staffIdList = myStaff.map(item => item.id);
    }
  } catch (e) {
    console.log(e);
  }
  return staffIdList;
};

module.exports = {
  getDepartments: async (req, res, next) => {
    if (req.user && req.user.id) {
      // var staffIDList = await getStaffIDList(req.user.id);
      let user_id = req.user.id;
      if (req.query && req.query.user_id) {
        user_id = req.query.user_id;
      }
      let where = {
        user_id: user_id
      };
      var sub_user_service_include = [];
      if (req.params && req.params.id) {
        where['id'] = req.params.id;
        sub_user_service_include.push('user');
      }
      let attributes = ['id', 'details', 'title', 'symbol', 'status', 'role_id'];
      if (req.lang && req.lang == 'es') {
        attributes = ['id', ['details_es', 'details'], ['title_es', 'title'], 'symbol', 'status', 'role_id'];
      }
      db.user_department.findAll({
        where: where,
        include: [
          {
            model: db.department,
            attributes,
            as: 'department',
            where: {
              status: true
            }
          },
          'locations']
      })
        .then(async resp => {
          if (req.params && req.params.id) {
            return response(res, resp[0]);
          }
          resp = JSON.parse(JSON.stringify(resp));
          for (var i = 0; i < resp.length; i++) {
            var r = resp[i];
            r.staff_no = (await getStaffIDList(req.user.id, { department_id: r.department_id })).length;
          }
          return response(res, resp);
        })
        .catch(err => errorResponse(res, err));
    } else {
      res.sendStatus(406);
    }
  },
  getSpecialities: async (req, res, next) => {
    if (req.user && req.user.id) {
      // var staffIDList = await getStaffIDList(req.user.id);
      let where = {
        user_id: req.user.id
      };
      var sub_user_service_include = [];
      if (req.params && req.params.id) {
        where['id'] = req.params.id;
        sub_user_service_include.push('user');
      }
      if (req.body && req.body.department_id) {
        where['department_id'] = req.body.department_id;
      }
      let attributes = ['id', 'details', 'title', 'symbol', 'status', 'department_id', 'role_id'];
      if (req.lang && req.lang == 'es') {
        attributes = ['id', ['details_es', 'details'], ['title_es', 'title'], 'symbol', 'status', 'department_id', 'role_id'];
      }
      db.user_speciality.scope().findAll({
        where: where,
        include: [
          { model: db.speciality, as: 'speciality', attributes, where: { status: true } },
          { model: db.department, as: 'department', where: { status: true } },
        ]
      })
        .then(async resp => {
          if (req.params && req.params.id) {
            return response(res, resp[0]);
          }
          resp = JSON.parse(JSON.stringify(resp));
          for (var i = 0; i < resp.length; i++) {
            var r = resp[i];
            r.staff_no = (await getStaffIDList(req.user.id, { speciality_id: r.speciality_id })).length;
          }
          return response(res, resp);
        })
        .catch(err => errorResponse(res, err));
    } else {
      res.sendStatus(406);
    }
  },

  async specialitiesSearch(req, res, next) {
    var clinic_id = req.user.id;

    let where = { status: true };
    let query = req.query || {};
    let body = req.body || {};
    if (query.need_department) {
      query.need_department = eval(query.need_department);
    }

    if (query.title || query.search) {
      let search = query.title || query.search;
      let cond = [
        { title: { [Op.like]: `%${search}%` } },
        { title_es: { [Op.like]: `%${search}%` } },
        { tags: { [Op.like]: `%${search}%` } }
      ];
      if (query.need_department) {
        cond.push(
          { '$department.title$': { [Op.like]: `%${search}%` } },
          { '$department.title_es$': { [Op.like]: `%${search}%` } },
          { '$department.tags$': { [Op.like]: `%${search}%` } }
        );
      }
      where = {
        status: true,
        [Op.or]: cond
      };
    }
    let attributes = ['id', 'details', 'title', 'symbol', 'status', 'department_id', 'role_id', 'category', 'tags', 'isDefaultSeleted'];
    if (req.lang && req.lang == 'es') {
      attributes = ['id', ['details_es', 'details'], ['title_es', 'title'], 'symbol', 'status', 'department_id', 'role_id', 'category', 'tags', 'isDefaultSeleted'];
    }

    var include = [
      {
        model: db.user_speciality,
        as: 'user_speciality',
        attributes: ['id', 'speciality_id', 'department_id'],
        where: {
          user_id: clinic_id
        },
        required: true
      },];
    if (query.need_department) {
      let attr = ['id', 'details', 'title', 'symbol'];
      if (req.lang && req.lang == 'es') {
        attr = ['id', ['details_es', 'details'], ['title_es', 'title'], 'symbol'];
      }
      include = [
        {
          model: db.department,
          attributes: attr,
          as: 'department',
          where: { status: true }
        },
        {
          model: db.user_service,
          as: 'user_service',
          attributes: ['id', 'user_id', 'service'],
          // attributes: []
          required: true
        },
        {
          model: db.user_speciality,
          as: 'user_speciality',
          attributes: ['id', 'speciality_id', 'department_id'],
          where: {
            user_id: clinic_id
          },
          required: true
        },

      ];
    }
    if (query.department_id) {
      where.department_id = query.department_id;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (!!!eval(query.categorise) && !!!eval(body.categorise)) {
      if (query.role_id) {
        where.role_id = query.role_id;
      }
      if (body.role_id) {
        where.role_id = body.role_id;
      }
    }
    if (!!query.search || !!body.search) {

    }


    try {
      // let resp = await db.speciality.findAll({ where: where, attributes });
      console.log(where, include);
      let resp = await db.speciality.findAll({
        where: where, include: include,
        attributes,
        order: [['isDefaultSeleted', 'DESC']]
      });
      let response = null;
      if (!!eval(query.categorise) || !!eval(body.categorise)) {
        response = {};
        resp.forEach(element => {
          response[element.category] = response[element.category] || [];
          response[element.category].push(element);
        });
      } else {
        response = resp;
      }
      res.send({
        status: true,
        data: response
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        status: false,
        errors: error
      });
    }
  },
  addDepartment: async (req, res, next) => {
    if (req.user && req.user.id) {
      let data = req.body;
      data['user_id'] = req.user.id;
      var where = { user_id: data.user_id };
      if (!!data.id) {
        where['id'] = data.id;
      } else {
        where['department_id'] = data.department_id;
      }
      db.user_department.findOrCreate({ where })
        .then(resp => resp[0].update(data))
        .then(async resp1 => {
          await db.user_department_location.destroy({ where: { user_department_id: resp1.id } });
          (data.locations || []).forEach(async element => {
            await db.user_department_location.create({
              user_id: data.user_id, user_department_id: resp1.id, location_id: element, department_id: data.department_id
            });
          });
          response(res, resp1, 'SERVER_MESSAGE.DATA_SAVED');
        })
        .catch(err => errorResponse(res, err));
    } else {
      res.sendStatus(406);
    }
  },
  addSpeciality: async (req, res, next) => {
    if (req.user && req.user.id) {
      let data = req.body;
      data['user_id'] = req.user.id;
      db.user_speciality.findOrCreate({
        where: {
          speciality_id: data.speciality_id, user_id: data.user_id
        }
      }).then(resp => resp[0].update(data))
        .then(resp1 => response(res, resp1, 'SERVER_MESSAGE.DATA_SAVED'))
        .catch(err => errorResponse(res, err));
    } else {
      res.sendStatus(406);
    }
  },
  deleteDepartment: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.user_department.destroy({
        where: {
          user_id: req.user.id, id: req.params.id
        }
      }).then(resp => response(res, resp, 'SERVER_MESSAGE.DATA_DELETED'))
        .catch(err => errorResponse(res, err));
    } else {
      res.sendStatus(406);
    }
  },
  deleteSpeciality: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.user_speciality.destroy({
        where: {
          user_id: req.user.id, id: req.params.id
        }
      }).then(resp => response(res, resp, 'SERVER_MESSAGE.DATA_DELETED'))
        .catch(err => errorResponse(res, err));
    } else {
      res.sendStatus(406);
    }
  },

};