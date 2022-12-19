const db = require("../../models")
const { queryEssentialString } = require('../middleware');

const consultations = async (req, res, next) => {
  let query = req.query || {};
  let st = {
    "0": "waiting", "1": "running", "2": "rejected", "3": "complete", "4": "error", "5": "accepted", "6": "slotBusy", "7": "rescheduling", "8": "canceled", 9: "consulted"
  }
  let selection = `SELECT b.patient_id,b.provider_id staff_id,
      CONCAT(COALESCE(u.first_name,''),' ',
            COALESCE(u.middle_name,''),' ',
            COALESCE(u.last_name,''),' ',
            COALESCE(u.last_name_2,'')
            ) patientName,
            u.gender,
            DATEDIFF(NOW(),u.dob) / 365.25 AS age,
            ss.start scheduledAt,ss.end scheduledTill,
      b.description, b.reference_id,
      #b.status,
      CASE `
  for (let k in st) {
    selection += `WHEN b.status = ${k} THEN "${st[k]}"`
  }
  selection += ` ELSE ""
      END
      as status,
      b.createdAt,b.updatedAt,s.title,JSON_EXTRACT(sa.tirage,'$.triage_level') triage_level, c.id cid`;
  let count = `select count(b.id) as total`;

  let sql = `
      FROM bookings b
      JOIN associates a ON b.provider_id = a.associate
      JOIN users u ON u.id = b.patient_id
      JOIN schedules ss on ss.id = b.schedule_id
      LEFT JOIN symptom_analysis sa ON sa.id = b.dignosis_id
      LEFT JOIN specialities s ON s.id = b.speciality_id
      LEFT JOIN customers c ON c.customer = b.patient_id
      WHERE a.user_id = ${req.user.id}
      AND b.payment_status = 1`

  if (!!query.patient_id) {
    sql += ` AND b.patient_id = ${query.patient_id}`
  }
  if (!!query.staff_id) {
    sql += ` AND b.staff_id = ${query.staff_id}`
  }


  if (!!query.triage) {
    sql += ` AND JSON_EXTRACT(sa.tirage,'$.triage_level') LIKE "%${query.triage}%"`
  }

  if (!!query.userType && query.userType == 'internal') {
    sql += ` AND c.id IS NOT NULL`
  }

  if (!!query.userType && query.userType == 'external') {
    sql += ` AND c.id IS NULL`
  }


  if (!!query.speciality_id) {
    sql += ` AND b.speciality_id = ${query.speciality_id}`
  }
  if (!!query.date_after) {
    sql += ` AND DATE(b.createdAt) >= DATE('${query._date_after}')`
  }
  if (!!query.date_before) {
    sql += ` AND DATE(b.createdAt) <= DATE('${query.date_before}')`
  }

  if (!!query.sheduled_after) {
    sql += ` AND ss.start >= '${new Date(query.sheduled_after)}'`
  }
  if (!!query.sheduled_before) {
    sql += ` AND ss.end <= '${new Date(query.sheduled_before)}'`
  }

  if (!!query.gender) {
    sql += ` AND u.gender = '${query.gender}'`
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
  let qrst = queryEssentialString(query.page, query.pageSize, null, (query.orderBy || 'b.id'), (query.order || 'desc'));
  sql += ` ${qrst}`
  db.sequelize.query(`${selection} ${sql}`).spread((r, m) => {
    res.send({ total, data: r })
  }).catch(e => res.status(400).send({ error: `${e}` }))
}

const consultation = async (req, res, next) => {
  db.booking.findOne({
    where: { reference_id: req.params.reference_id }, include: [
      "schedule", 'analysis', 'speciality'
    ]
  }).then(resp => res.send(resp)).catch(e => res.status(400).send({ error: `${e}` }))
}

const saveConsultation = (req, res, next) => {
  let data = req.body || {};
  let errors = {};
  if (!!!data.reference_id) {
    errors.reference_id = 'required'
  }
  if (!!!data.patient_id) {
    errors.patient_id = 'required'
  }
  if (!!!data.staff_id) {
    errors.staff_id = 'required'
  }
  if (!!!data.description) {
    errors.description = 'required'
  }
  return 1
}

module.exports = {
  consultations, consultation, saveConsultation
}