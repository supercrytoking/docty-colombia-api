const db = require("../../models")
const { queryEssentialString } = require('../middleware');
const prescriptions = async (req, res, next) => {
  let query = req.query || {};
  let selection = `SELECT u.gender, p.reference_id reference_id,b.patient_id patient_id,
  b.provider_id staff_id,p.diagnostics,p.medications,p.cups,
    CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) patientName,
    DATEDIFF(NOW(),u.dob) / 365.25 AS age, u.gender gender, p.createdAt createdAt `;
  let count = `select count(p.id) as total `;
  let sql = `
    FROM prescriptions p
    JOIN bookings b ON b.reference_id = p.reference_id
    JOIN users u ON b.patient_id = u.id
    JOIN associates a ON a.associate = b.provider_id
    WHERE a.user_id = ${req.user.id}`;

  if (!!query.patient_id) {
    sql += ` AND b.user_id = ${query.patient_id}`
  }
  if (!!query.staff_id) {
    sql += ` AND b.provider_id = ${query.staff_id}`
  }
  if (!!query.diagnostic) {
    sql += ` AND p.diagnostics like "%${query.diagnostic}%"`
  }
  if (!!query.medicine) {
    sql += ` AND p.medications like "%${query.medicine}%"`
  }
  if (!!query.cup) {
    sql += ` AND p.cups like "%${query.cup}%"`
  }
  if (!!query.gender) {
    sql += ` AND u.gender = "${query.gender}"`
  }
  if (!!query.date_after) {
    sql += ` AND DATE(p.createdAt)  >= DATE("${query.date_after}")`
  }
  if (!!query.date_before) {
    sql += ` AND DATE(p.createdAt)  <= DATE("${query.date_before}")`
  }
  if (!!query.age_max && !!query.age_max) {
    sql += ` HAVING age BETWEEN ${query.age_min} AND  ${query.age_max}`
  } else {
    if (!!query.age_min) {
      sql += ` HAVING age >= ${query.age_min}`
    }
    if (!!query.age_max) {
      sql += ` HAVING age <= ${query.age_max}`
    }
  }
  let total = await db.sequelize.query(`${count} ${sql}`).spread((r, m) => r[0].total).catch(e => 0)
  let qrst = queryEssentialString(query.page, query.pageSize, null, (query.orderBy || 'p.id'), (query.order || 'desc'));
  sql += ` ${qrst}`
  db.sequelize.query(`${selection} ${sql}`).spread((r, m) => {
    res.send({ total, data: r })
  }).catch(e => res.status(400).send({ error: `${e}` }))
}

const prescription = async (req, res, next) => {
  let sql = `SELECT u.gender, b.patient_id patient_id, b.provider_id staff_id,p.*,
    CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) patientName,
    DATEDIFF(NOW(),u.dob) / 365.25 AS age, u.gender gender, p.createdAt createdAt
    FROM prescriptions p
    JOIN bookings b ON b.reference_id = p.reference_id
    JOIN users u ON b.patient_id = u.id
    JOIN associates a ON a.associate = b.provider_id
    WHERE a.user_id = ${req.user.id} and p.reference_id = '${req.params.reference_id}'`;
  db.sequelize.query(sql).spread((r, m) => {
    res.send(r[0])
  }).catch(e => res.status(400).send({ error: `${e}` }))
}

const savePrecription = (req, res, next) => {

}

module.exports = {
  prescriptions, prescription, savePrecription
}