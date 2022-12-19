const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

module.exports = {
  getServices: async (req, res, next) => {
    if (req.user && req.user.id) {
      let where = {
        user_id: req.user.id
      }
      if (req.params && req.params.id) {
        where['id'] = req.params.id
      }
      if (req.query && req.query.expertise_level) {
        where['expertise_level'] = req.query.expertise_level
      }
      let attributes = ['id', 'details', 'title', 'symbol', 'status'];
      if (req.lang && req.lang == 'es') {
        attributes = ['id', ['details_es', 'details'], ['title_es', 'title'], 'symbol', 'status'];
      }
      db.company_service.findAll({
        where: where,
        // attributes: attributes,
        include: ['insurence_provider',
          {
            model: db.user_speciality.scope(),
            attributes: ['id'],
            as: 'user_speciality',
            include: [
              {
                model: db.department,
                as: 'department',
                attributes: attributes
              },
              {
                model: db.speciality,
                as: 'speciality',
                attributes: attributes
              }
            ]
          },
          {
            model: db.consultation_type_detail,
            as: 'consultation_type_detail',
            where: { language: req.lang || 'en' }
          }]
      })
        .then(resp => {
          if (req.params && req.params.id) {
            return response(res, resp[0])
          }
          return response(res, resp)
        })
        .catch(err => errorResponse(res, err));
    } else {
      res.sendStatus(406)
    }
  },

  addService: async (req, res, next) => {
    if (req.user && req.user.id) {
      try {
        let data = req.body;
        data['user_id'] = req.user.id;
        console.log(data)
        var where = {
          user_id: data.user_id,
          type: data.type,
          user_department_id: data.user_department_id,
          user_speciality_id: data.user_speciality_id,
          type_code: data.type_code,
          expertise_level: data.expertise_level
        };
        if (data.type == 1 && data.insurance_provider_id) where.insurance_provider_id = data.insurance_provider_id;

        var exist = await db.company_service.findOne({ where: where });

        if (!!exist && !!!data.id) {
          throw 'ALREADY_CONFIGURED_SERVICE';
        }
        db.company_service.upsert(data)
          .then(resp1 => response(res, resp1, 'SERVER_MESSAGE.DATA_SAVED'))
          .catch(err => errorResponse(res, err));
      } catch (e) {
        errorResponse(res, e, `${e}`);
      }
    } else {
      res.sendStatus(406)
    }
  },

  deleteService: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.company_service.destroy({
        where: {
          user_id: req.user.id, id: req.params.id
        }
      }).then(resp => response(res, resp, 'SERVER_MESSAGE.DATA_DELETED'))
        .catch(err => errorResponse(res, err))
    } else {
      res.sendStatus(406)
    }
  }
}