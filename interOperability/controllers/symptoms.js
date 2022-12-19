const db = require("../../models")
const { queryEssentialString } = require('../middleware');
const assessments = async (req, res, next) => {
  let query = req.query || {};
  let path = (req.path || '').replace(/\//g, '');
  let selection = `SELECT symptom_analysis.id id, symptom_analysis.age,symptom_analysis.sex, JSON_EXTRACT(symptom_analysis.tirage,'$.triage_level') triage_level,symptom_analysis.createdAt,
        symptom_analysis.symptom_status, bookings.id AS booking_id, symptom_analysis.changed_admin_id,symptom_analysis.changed_user_id,
       CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) patientName,u.email,u.phone_number`;
  let count = `select count(symptom_analysis.id) as total `;
  let sql = `
        FROM symptom_analysis
        JOIN users u ON u.id = symptom_analysis.user_id AND u.deletedAt IS NULL
        JOIN health_advisors ON health_advisors.patient_id = symptom_analysis.user_id
        AND health_advisors.clinic_id = ${req.user.id} AND health_advisors.approved = 1
        LEFT JOIN bookings ON bookings.dignosis_id = symptom_analysis.id AND bookings.payment_status = 1
        WHERE (symptom_analysis.family_id = 0 OR (health_advisors.family_access = 1 AND symptom_analysis.family_id > 0))`
  switch (path) {
    case 'active':
      sql += `AND (symptom_analysis.changed_admin_id IS NULL AND symptom_analysis.changed_user_id IS NULL AND  bookings.id IS NULL)`
      break;
    case 'inactive':
      sql += `AND (symptom_analysis.changed_admin_id IS NOT NULL OR symptom_analysis.changed_user_id IS NOT NULL OR  bookings.id IS NOT NULL)`
      break;
    default:
  }
  if (!!query.triage) {
    sql += ` AND JSON_EXTRACT(symptom_analysis.tirage,'$.triage_level')  LIKE "%${query.triage}%"`
  }
  if (!!query.patient_id) {
    sql += ` AND symptom_analysis.user_id  = ${query.patient_id}`
  }
  if (!!query.age_min) {
    sql += ` AND symptom_analysis.age  >= ${query.age_min}`
  }
  if (!!query.age_max) {
    sql += ` AND symptom_analysis.age  <= ${query.age_max}`
  }
  if (!!query.sex) {
    sql += ` AND symptom_analysis.sex  <= ${query.sex}`
  }
  if (!!query.date_after) {
    sql += ` AND DATE(symptom_analysis.createdAt)  >= DATE("${query.date_after}")`
  }
  if (!!query.date_before) {
    sql += ` AND DATE(symptom_analysis.createdAt)  <= DATE("${query.date_before}")`
  }
  let total = await db.sequelize.query(`${count} ${sql}`).spread((r, m) => r[0].total).catch(e => 0)
  let qrst = queryEssentialString(query.page, query.pageSize, null, (query.orderBy || 'symptom_analysis.id'), (query.order || 'desc'));
  sql += ` ${qrst}`
  db.sequelize.query(`${selection} ${sql}`).spread((r, m) => {
    res.send({ total, data: r })
  }).catch(e => res.status(400).send({ error: `${e}` }))
}

const assessment = async (req, res, next) => {
  db.symptom_analysis.findByPk(req.params.id, {
    include: [{
      model: db.booking,
      as: 'booking',
      attributes: ['id', 'status']
    }, 'speciality', {
      model: db.user.scope('publicInfo'),
      attributes: ['first_name', 'last_name', 'id', 'middle_name', 'email', 'phone_number', 'dob'],
      as: 'userInfo'
    }]
  })
    .then(resp => res.send(resp))
    .catch(e => res.status(400).send({ error: `${e}` }));
}

module.exports = {
  assessments, assessment
}