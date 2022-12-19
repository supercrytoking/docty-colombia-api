const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

module.exports = {
  dashboard: async (req, res, next) => {
    let sql1 = `
    SELECT COUNT(p.id) AS totalPrescription FROM prescriptions p,bookings b WHERE p.reference_id = b.reference_id AND b.pharmacy = ${req.user.id} AND b.status = 3
    `
    let sql2 = `
    SELECT COUNT(p.id) AS todaysPrescription FROM prescriptions p,bookings b WHERE p.reference_id = b.reference_id AND b.pharmacy = ${req.user.id} AND b.status = 3 AND p.createdAt = CURDATE()
    `
    let sql3 = `SELECT COUNT(id) clinics FROM clinic_pharmacies WHERE pharmacy_id = ${req.user.id}`

    let sql = `SELECT * FROM (
      (${sql1}) v1,(${sql2}) v2,(${sql3}) v3
    )`;

    db.sequelize.query(sql).spread((r, m) => {
      res.send(r[0])
    }).catch(e => res.status(400).send({ status: false, error: (e.message || `${e}`) }))
  },
}