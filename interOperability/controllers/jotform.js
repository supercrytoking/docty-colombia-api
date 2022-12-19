const db = require("../../models")
const { queryEssentialString } = require('../middleware');
const submissions = async (req, res, next) => {
  let query = req.query || {};

  let selection = `SELECT j.user_id patient_id,j.added_by staff_id,j.formId,j.submissionID,j.consultationId,j.createdAt,j.pdfPath,
      CONCAT(COALESCE(u.first_name,''),' ',
      COALESCE(u.middle_name,''),' ',
      COALESCE(u.last_name,''),' ',
      COALESCE(u.last_name_2,'')
      ) patientName,
      j.updatedAt,
      u.gender,DATEDIFF(NOW(),u.dob) / 365.25 AS age`;
  let count = `SELECT COUNT(j.id) as total`;
  let sql = `FROM jotforms j
      JOIN clinic_jotforms cj  ON cj.form_id = j.formId
      JOIN users u ON u.id = j.user_id
      WHERE cj.clinic_id = ${req.user.id}`;
  if (!!query.gender) {
    sql += ` AND u.gender = '${query.gender}'`
  }

  if (!!query.patient_id) {
    sql += ` AND j.user_id = ${query.patient_id}`
  }
  if (!!query.staff_id) {
    sql += ` AND j.added_by = ${query.staff_id}`
  }

  if (!!query.submission_date_after) {
    sql += ` AND DATE(j.createdAt) >= DATE('${query.submission_date_after}')`
  }
  if (!!query.submission_date_before) {
    sql += ` AND DATE(j.createdAt) <= DATE('${query.submission_date_before}')`
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
  let qrst = queryEssentialString(query.page, query.pageSize, null, (query.orderBy || 'j.id'), (query.order || 'desc'));
  sql += ` ${qrst}`
  console.log(sql)

  db.sequelize.query(`${selection} ${sql}`).spread((r, m) => {
    res.send({ total, data: r })
  }).catch(e => res.status(400).send({ error: `${e}` }))
}

const submission = async (req, res, next) => {
  let query = `SELECT j.user_id patient_id,j.added_by staff_id,j.formId,j.submissionID,j.consultationId,j.data,j.createdAt,j.pdfPath,
      CONCAT(COALESCE(u.first_name,''),' ',
      COALESCE(u.middle_name,''),' ',
      COALESCE(u.last_name,''),' ',
      COALESCE(u.last_name_2,'')
      ) patientName,
      u.gender,DATEDIFF(NOW(),u.dob) / 365.25 AS age
      FROM jotforms j
      JOIN clinic_jotforms cj  ON cj.form_id = j.formId
      JOIN users u ON u.id = j.user_id and u.deletedAt IS NULL
      WHERE cj.clinic_id = ${req.user.id} AND j.submissionID = '${req.params.submissionID}'
      `;
  db.sequelize.query(`${query}`).spread((r, m) => {
    res.send(r[0])
  }).catch(e => res.status(400).send({ error: `${e}` }))
}

const saveSubmissions = (req, res, next) => {
  return 1;
}

module.exports = {
  submissions, submission, saveSubmissions
}