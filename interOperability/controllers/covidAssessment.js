const db = require("../../models")
const { queryEssentialString } = require('../middleware');
const assessments = async (req, res, next) => {
  let query = req.query || {};
  let path = (req.path || '').replace(/\//g, '');
  let selection = `SELECT cc.user_id patient_id,cc.id,JSON_EXTRACT(cc.triage,'$.triage_level') triage_level,cc.gender,cc.age ,
    CONCAT(COALESCE(u.first_name,''),' ',
                COALESCE(u.middle_name,''),' ',
                COALESCE(u.last_name,''),' ',
                COALESCE(u.last_name_2,'')
                ) patientName `;
  let sql = `
                FROM covid_checkers cc
    JOIN customers c ON c.customer = cc.user_id
    JOIN users u ON u.id = cc.user_id
    WHERE c.user_id = ${req.user.id}`;
  let count = `select count(cc.id) as total `;

  if (!!query.triage) {
    sql += ` AND JSON_EXTRACT(cc.triage,'$.triage_level')  LIKE "%${query.triage}%"`
  }
  if (!!query.patient_id) {
    sql += ` AND cc.user_id  LIKE "%${query.patient_id}%"`
  }
  if (!!query.age_min) {
    sql += ` AND cc.age  >= "%${query.age_min}%"`
  }
  if (!!query.age_max) {
    sql += ` AND cc.age  <= "%${query.age_max}%"`
  }
  if (!!query.gender) {
    sql += ` AND cc.gender  <= "%${query.gender}%"`
  }
  if (!!query.date_after) {
    sql += ` AND DATE(cc.createdAt)  >= DATE("${query.date_after}")`
  }
  if (!!query.date_before) {
    sql += ` AND DATE(cc.createdAt)  <= DATE("${query.date_before}")`
  }
  let total = await db.sequelize.query(`${count} ${sql}`).spread((r, m) => r[0].total).catch(e => 0)
  let qrst = queryEssentialString(query.page, query.pageSize, null, (query.orderBy || 'cc.id'), (query.order || 'desc'));
  sql += ` ${qrst}`
  db.sequelize.query(`${selection} ${sql}`).spread((r, m) => {
    res.send({ total, data: r })
  }).catch(e => res.status(400).send({ error: `${e}` }))
}

const assessment = async (req, res, next) => {
  let sql = `SELECT cc.user_id patient_id,cc.id,cc.triage,cc.gender,cc.age ,cc.input_data,cc.user_response,
    CONCAT(COALESCE(u.first_name,''),' ',
                COALESCE(u.middle_name,''),' ',
                COALESCE(u.last_name,''),' ',
                COALESCE(u.last_name_2,'')
                ) patientName FROM covid_checkers cc
    JOIN customers c ON c.customer = cc.user_id
    JOIN users u ON u.id = cc.user_id
    WHERE cc.id = ${req.params.id} AND c.user_id = ${req.user.id}`;
  db.sequelize.query(sql).spread((r, m) => {
    res.send(r[0])
  }).catch(e => res.status(400).send({ error: `${e}` }))
}
module.exports = {
  assessments, assessment
}