const db = require("../../models")
const { queryEssentialString } = require('../middleware');

const invoices = async (req, res, next) => {
  let query = req.query || {};
  let selection = `SELECT i.to_id patiet_id,i.from_id staff_id,i.reference_id,i.invoice_id,i.payment_mod,i.currency,i.amount,i.status,i.details,i.pdf,i.discount,i.createdAt,i.updatedAt,i.insurance_cover`;
  let count = `SELECT COUNT(i.id) as total`;
  let sql = ` FROM invoices i
    JOIN associates a ON a.associate = i.from_id
    WHERE a.user_id = ${req.user.id}`;
  if (!!query.patient_id) {
    sql += ` AND i.to_id = ${query.patient_id}`
  }
  if (!!query.staff_id) {
    sql += ` AND i.from_id = ${query.staff_id}`
  }
  if (!!query.date_after) {
    sql += ` AND DATE(i.createdAt) >= DATE('${query._date_after}')`
  }
  if (!!query.date_before) {
    sql += ` AND DATE(i.createdAt) <= DATE('${query.date_before}')`
  }
  let total = await db.sequelize.query(`${count} ${sql}`).spread((r, m) => r[0].total).catch(e => 0)
  let qrst = queryEssentialString(query.page, query.pageSize, null, (query.orderBy || 'i.id'), (query.order || 'desc'));
  sql += ` ${qrst}`
  db.sequelize.query(`${selection} ${sql}`).spread((r, m) => {
    res.send({ total, data: r })
  }).catch(e => res.status(400).send({ error: `${e}` }))
}

const invoice = async (req, res, next) => {
  let sql = `SELECT i.to_id patiet_id,i.from_id staff_id,i.reference_id,i.invoice_id,i.payment_mod,i.currency,i.amount,i.status,i.details,i.pdf,i.discount,i.createdAt,i.insurance_cover FROM invoices i
    JOIN associates a ON a.associate = i.from_id
    WHERE a.user_id = ${req.user.id} AND i.invoice_id = '${req.params.invoice_id}'`;
  db.sequelize.query(`${sql}`).spread((r, m) => {
    res.send(r[0])
  }).catch(e => res.status(400).send({ error: `${e}` }))
}
const saveInvoices = (req, res, next) => {
  return 1
}
module.exports = {
  invoices, invoice, saveInvoices
}