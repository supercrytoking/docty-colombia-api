const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const { otpTrigger } = require('../../commons/crmTrigger');
const { generateToken } = require('../../commons/helper');

module.exports = {
  search: async (req, res, next) => {
    if (req.user && req.user.id) {
      let page = 1;
      let data = {};
      let query = {};
      if (req.query) query = req.query;
      if (req.body) data = req.body;
      if (data.page || query.page) {
        page = data.page || query.page;
      }
      let where = {}
      let specialityCond = {}
      let specialityRequired = false;
      let dateReq = false;
      let date = new Date();

      if (data.search || query.search) {
        let search = data.search || query.search;
        where = {
          [Op.or]: [
            { first_name: { [Op.like]: `%${search}%` } },
            { middle_name: { [Op.like]: `%${search}%` } },
            { last_name: { [Op.like]: `%${search}%` } },
            { company_name: { [Op.like]: `%${search}%` } },
          ]
        }
      }
      if (data.speciality_id || query.speciality_id) {
        let speciality_id = data.speciality_id || query.speciality_id;
        if (typeof speciality_id == 'string') speciality_id = speciality_id.split(',');
        if (typeof speciality_id == 'number') speciality_id = [speciality_id];
        speciality_id = speciality_id.map(e => parseInt(e))

        specialityCond = { speciality_id: { [Op.in]: speciality_id } }
        specialityRequired = true;
      }
      if (data.gender || query.gender) {
        let gender = data.gender || query.gender;
        where['gender'] = gender
      }

      let role = data.role || query.role;
      if (data.date || query.date) {
        let d = data.date || query.date;
        date = new Date(d);
        dateReq = (role == 1 || role == 3);
      }
      let toDate = new Date(date);
      toDate = toDate.setHours(23);
      toDate = new Date(toDate).setMinutes(59);
      toDate = new Date(toDate).setSeconds(59);
      let include = [
        {
          model: db.user_service,
          as: 'services',
          where: specialityCond,
          required: specialityRequired
        },
        {
          model: db.schedule.scope('essentialsOnly'),
          as: 'schedule',
          where: {
            start: { [Op.gte]: date },
            end: { [Op.lte]: toDate }
          },
          required: dateReq
        },
        {
          model: db.my_favorite,
          as: 'favorite_of',
          seperate: true,
          limit: 1,
          required: false,
          where: { user_id: req.user.id }
        },

        'rating_summary',

      ]
      if (!!role) {
        if (typeof role == 'string') role = role.split(',');
        if (typeof role == 'number') role = [role];
        role = role.map(e => parseInt(e))
        include.push({
          model: db.user_role,
          as: 'user_role',
          where: { role_id: { [Op.in]: role } }
        })
      } else {
        include.push({
          model: db.user_role,
          as: 'user_role',
          where: { role_id: { [Op.ne]: 2 } }
        })
      }
      if (data.insurance_provider_id || query.insurance_provider_id) {
        let provider_id = data.insurance_provider_id || query.insurance_provider_id;
        // if (typeof provider_id == 'string') provider_id = provider_id.split(',');
        if (typeof provider_id == 'number') provider_id = [provider_id];
        if (typeof provider_id == 'object') {
          provider_id = provider_id.join(',');
        }
        // provider_id = provider_id.map(e => parseInt(e))
        let sql = `SELECT a.associate,a.user_id FROM associates a, insurance_associates i 
                  WHERE a.user_id = i.user_id AND i.provider_id IN (${provider_id})`;
        let resp = await db.sequelize.query(sql)//.spread(resp => {
        if (resp) {
          let set = new Set();
          resp[0].map(e => {
            set.add(e.associate);
            set.add(e.user_id);
          })
          let ids = Array.from(set);
          where['id'] = { [Op.in]: ids }
          console.log(ids)
        }
      }

      db.user.scope('publicInfo')
        .findAll({
          where: where,
          include: include,
          // order: [['fullName', 'ASC']],
          limit: getLimitOffset(page)
        }).then(resp => {
          return response(res, resp)
        }).catch(err => {
          return errorResponse(res, err)
        })

    } else {
      res.sendStatus(406)
    }
  }
}