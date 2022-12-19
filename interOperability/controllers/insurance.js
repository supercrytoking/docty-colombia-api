const Sequelize = require('sequelize');
const db = require("../../models")
const { queryEssentialString } = require('../middleware');
const Op = Sequelize.Op;

module.exports = {
  insuranceProviders: async (req, res, next) => {
    let query = req.query || {};
    let where = { name: { [Op.like]: `%${(query.name || '')}%` } };
    if (!!query.country) {
      where = {
        name: { [Op.like]: `%${(query.name || '')}%` },
        [Op.or]: [
          { '$insurence_service_country.shortname$': query.country },
          { '$insurence_service_country.name$': query.country },
          { '$insurence_service_country.id$': query.country },
        ]
      }
    }
    db.insurence_provider.findAndCountAll({ where: where })
      .then(resp => res.send({ total: resp.count, data: resp.rows }))
      .catch(e => res.status(400).send({ error: `${e}` }))
  },
  insuranceMyAssciates: async (req, res, next) => {
    db.insurance_associate.findAndCountAll({
      where: { user_id: req.user.id },
      attributes: {
        exclude: ['createdAt', 'updatedAt', 'user_id'],
        include: [[db.sequelize.col('provider.name'), 'name'],
        [db.sequelize.col('provider.insurence_service_country.shortname'), 'country']]
      },
      include: [{
        model: db.insurence_provider,
        as: 'provider',
        attributes: []
      }]
    })
      .then(resp => res.send({ total: resp.count, data: resp.rows }))
      .catch(e => res.status(400).send({ error: `${e}` }))
  },
  paientWithInsurance: async (req, res, next) => {
    let query = req.query || {};
    let selection = `
    SELECT  CONCAT(COALESCE(u.first_name,''),' ',
                COALESCE(u.middle_name,''),' ',
                COALESCE(u.last_name,''),' ',
                COALESCE(u.last_name_2,'')
                ) patientName , u.id patient_id, u.dob,ip.id provider_id,
                ip.name provider_name,ui.start_date,ui.end_date,ui.card_copy,ui.card_number,ui.member_id `;
    let count = "select count(u.id) as total"
    let sql = ` 
        FROM users u
        JOIN customers c ON c.customer = u.id
        JOIN user_insurances ui ON ui.user_id = u.id
        JOIN insurence_providers ip ON ip.id = ui.company
        WHERE c.user_id = ${req.user.id} `;
    if (!!req.params.id || query.provider_id) {
      let id = req.params.id || query.provider_id
      sql += ` AND ui.company = ${id}`
    } else {
      sql += ` AND ui.company IS NOT NULL`
    }
    if (!!query.expire_after) {
      sql += ` AND DATE(ui.end_date) >= DATE('${query.expire_after}')`
    }
    if (!!query.expire_before) {
      sql += ` AND DATE(ui.end_date) <= DATE('${query.expire_before}')`
    }
    let total = await db.sequelize.query(`${count} ${sql}`).spread((r, m) => r[0].total).catch(e => 0)
    let qrst = queryEssentialString(query.page, query.pageSize, null, (query.orderBy || 'patientName'), (query.order || 'ASC'));
    sql += ` ${qrst}`
    db.sequelize.query(`${selection} ${sql}`).spread((r, m) => {
      res.send({ total, data: r })
    }).catch(e => res.status(400).send({ error: `${e}` }))
  },
  MyAssciate: async (req, res, next) => {
    return 1
  },
  paientUpdateInsurance: async (req, rea, next) => {

  }
}