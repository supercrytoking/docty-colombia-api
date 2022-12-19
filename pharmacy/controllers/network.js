const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

module.exports = {
  clinics: async (req, res, next) => {
    db.user.scope('publicInfo', 'contactInfo').findAll({
      where: {},
      include: [{
        model: db.clinic_pharmacy,
        as: 'clinic_pharmacy',
        where: { pharmacy_id: req.user.id },
        required: true
      }]
    })
      .then(rep => res.send(rep))
      .catch(e => res.status(400).send({ status: false, error: (e.message || `${e}`) }))
  },
}