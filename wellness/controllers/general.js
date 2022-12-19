const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

module.exports = {
  translations: async (req, res, next) => {
    db.translation.findAll({
      where: { section: 'WELLNESS_WEB' },
      attributes: ['keyword', 'en', 'es'],
      order: [['keyword', 'asc']]
    }).then(r => res.send(r))
  },
  getClinicList: async (req, res, next) => {
    let user = req.user || {};
    let sql = `SELECT u.company_name, u.id, u.picture FROM users u,user_roles ur WHERE ur.user_id = u.id AND ur.role_id = 5`;
    if (user.role == 5 || user.role == 'clinic') {
      sql += ` AND u.id = ${user.id}`;
    }
    sql += ` ORDER BY u.company_name`
    return db.sequelize.query(sql).spread((r, m) => res.send(r)).catch(e => res.send([]));
  }
}