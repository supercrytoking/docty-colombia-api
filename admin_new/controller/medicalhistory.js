const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

module.exports = {
  medicalHistory: async (req, res, next) => {
    let data = req.body || {};
    data.added_by_admin = req.user.id;
    if (!!!data.user_id) {
      data.user_id = req.user.id;
    }
    if (!!!data.family_id) data.family_id = 0;
    db.userMedicalHistory.upsert(data).then(resp => res.send({ data: resp })).catch(e => res.status(400).send({ status: false, error: `${e}` }))
  },
  medicalHistories: async (req, res, next) => {
    let where = {};
    let query = req.query || {};
    let order = ['dated', 'desc'];
    if (req.params.class) {
      where.class = req.params.class;
    }
    if (query.family_id) {
      where.family_id = query.family_id;
    }
    else {
      where.family_id = { [Op.in]: [0, null] };
    }
    if (query.user_id) {
      where.user_id = query.user_id;
    }
    if (req.params.class == 'prescription') {
      order = ['response.startDate', 'desc']
    }
    db.userMedicalHistory.findAll({
      where: where,
      order: [order],
      include: [{
        model: db.user,
        as: 'added_by_user',
        attributes: ['first_name', 'middle_name', 'last_name', 'last_name_2', 'company_name', 'fullName']
      },
      {
        model: db.admin,
        as: 'added_by_admin_user',
        attributes: ['first_name', 'last_name', 'fullName']
      }
      ]
    }).then(resp => res.send(resp)).catch(e => res.status(400).send({ status: false, error: `${e}` }))
  },
  deletemedicalHistories: async (req, res, next) => {
    let where = {};
    if (req.params.id) {
      where.id = req.params.id;
    }
    db.userMedicalHistory.destroy({ where }).then(resp => res.send({ status: true })).catch(e => res.status(400).send({ status: false, error: `${e}` }))
  }
}