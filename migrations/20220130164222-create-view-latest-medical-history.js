'use strict';
const fullName = `CONCAT_WS(' ',u.first_name,NULLIF(u.middle_name,''),NULLIF(u.last_name,''),NULLIF(u.last_name_2,'')) AS fullName`;
const steps = `SELECT ${fullName}, u.gender, u.dob, m1.* ,
IF (CONVERT(JSON_EXTRACT(m1.response, '$.walked_steps'),DECIMAL) >= CONVERT(JSON_EXTRACT(m1.response, '$.target_steps'),DECIMAL), 'COMPLETED','INCOMPLETE') AS label
FROM user_medical_histories m1 
LEFT JOIN user_medical_histories m2
 ON (m1.user_id = m2.user_id AND m1.class = m2.class AND m1.dated < m2.dated AND m2.deletedAt IS NULL)
JOIN users u ON m1.user_id = u.id
WHERE m2.id IS NULL AND m1.deletedAt IS NULL AND m1.user_id IS NOT NULL AND m1.class = 'walking'
ORDER BY m1.user_id;`

const spo2 = `SELECT ${fullName}, u.gender, u.dob, m1.*,
IF (CONVERT(JSON_EXTRACT(m1.response, '$.spo2'),DECIMAL) >= 94, 'NORMAL','LOW') AS label
FROM user_medical_histories m1 
LEFT JOIN user_medical_histories m2
 ON (m1.user_id = m2.user_id AND m1.class = m2.class AND m1.dated < m2.dated AND m2.deletedAt IS NULL)
JOIN users u ON m1.user_id = u.id
WHERE m2.id IS NULL AND m1.deletedAt IS NULL AND m1.user_id IS NOT NULL AND m1.class = 'spo2'
ORDER BY m1.user_id;`

const temp = `SELECT ${fullName}, u.gender, u.dob, m1.*,
CASE
	WHEN JSON_EXTRACT(m1.response, '$.unit') = "c" OR JSON_EXTRACT(m1.response, '$.unit') = "C" THEN
		CASE
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.temperature'),DECIMAL) < 35.4 THEN 'HYPOTHERMIA'
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.temperature'),DECIMAL) BETWEEN 35.4 AND 37.8 THEN 'NORMAL'
			ELSE "FEVER"
		END
	WHEN JSON_EXTRACT(m1.response, '$.unit') = "f" OR JSON_EXTRACT(m1.response, '$.unit') = "F" THEN
		CASE
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.temperature'),DECIMAL) < 96.5 THEN 'HYPOTHERMIA'
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.temperature'),DECIMAL) BETWEEN 96.5 AND 100 THEN 'NORMAL'
			ELSE "FEVER"
		END
END AS label
FROM user_medical_histories m1 
LEFT JOIN user_medical_histories m2
 ON (m1.user_id = m2.user_id AND m1.class = m2.class AND m1.dated < m2.dated AND m2.deletedAt IS NULL)
JOIN users u ON m1.user_id = u.id
WHERE m2.id IS NULL AND m1.deletedAt IS NULL AND m1.user_id IS NOT NULL AND m1.class = 'temperature'
ORDER BY m1.user_id;`

const hr = `SELECT ${fullName}, u.gender, u.dob, m1.*,
CASE
	WHEN CONVERT(JSON_EXTRACT(m1.response, '$.avg'),DECIMAL) < 56 THEN 'ATHELETE'
	WHEN CONVERT(JSON_EXTRACT(m1.response, '$.avg'),DECIMAL) BETWEEN 57 AND 62 THEN 'EXCELLENT'
	WHEN CONVERT(JSON_EXTRACT(m1.response, '$.avg'),DECIMAL) BETWEEN 62 AND 67 THEN 'GOOD'
	WHEN CONVERT(JSON_EXTRACT(m1.response, '$.avg'),DECIMAL) BETWEEN 68 AND 75 THEN 'AVARAGE'
	WHEN CONVERT(JSON_EXTRACT(m1.response, '$.avg'),DECIMAL) BETWEEN 76 AND 82 THEN 'BELOW_AVARAGE'
	ELSE "POOR"
END AS label
FROM user_medical_histories m1 
LEFT JOIN user_medical_histories m2
 ON (m1.user_id = m2.user_id AND m1.class = m2.class AND m1.dated < m2.dated AND m2.deletedAt IS NULL)
JOIN users u ON m1.user_id = u.id
WHERE m2.id IS NULL AND m1.deletedAt IS NULL AND m1.user_id IS NOT NULL AND m1.class = 'heart_rate'
ORDER BY m1.user_id;`

const sleep = `SELECT ${fullName}, u.gender, u.dob, m1.*,
CASE
	WHEN ROUND(DATEDIFF(CURRENT_TIMESTAMP, dob)/365.25) < 1 THEN
		CASE
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.sleep_hrs'),DECIMAL) < 12 THEN "BELOW_AVARAGE"
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.sleep_hrs'),DECIMAL) BETWEEN 12 AND 17 THEN "AVARAGE"
			ELSE "ABOVE_AVARAGE"
		END
	WHEN ROUND(DATEDIFF(CURRENT_TIMESTAMP, dob)/365.25) BETWEEN 1 AND 2 THEN
		CASE
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.sleep_hrs'),DECIMAL) < 11 THEN "BELOW_AVARAGE"
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.sleep_hrs'),DECIMAL) BETWEEN 11 AND 14 THEN "AVARAGE"
			ELSE "ABOVE_AVARAGE"
		END
	WHEN ROUND(DATEDIFF(CURRENT_TIMESTAMP, dob)/365.25) BETWEEN 3 AND 5 THEN
		CASE
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.sleep_hrs'),DECIMAL) < 10 THEN "BELOW_AVARAGE"
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.sleep_hrs'),DECIMAL) BETWEEN 10 AND 13 THEN "AVARAGE"
			ELSE "ABOVE_AVARAGE"
		END
	WHEN ROUND(DATEDIFF(CURRENT_TIMESTAMP, dob)/365.25) BETWEEN 6 AND 12 THEN
		CASE
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.sleep_hrs'),DECIMAL) < 9 THEN "BELOW_AVARAGE"
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.sleep_hrs'),DECIMAL) BETWEEN 9 AND 12 THEN "AVARAGE"
			ELSE "ABOVE_AVARAGE"
		END
	WHEN ROUND(DATEDIFF(CURRENT_TIMESTAMP, dob)/365.25) BETWEEN 13 AND 18 THEN
		CASE
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.sleep_hrs'),DECIMAL) < 8 THEN "BELOW_AVARAGE"
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.sleep_hrs'),DECIMAL) BETWEEN 8 AND 10 THEN "AVARAGE"
			ELSE "ABOVE_AVARAGE"
		END
	ELSE
		CASE
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.sleep_hrs'),DECIMAL) < 7 THEN "BELOW_AVARAGE"
			WHEN CONVERT(JSON_EXTRACT(m1.response, '$.sleep_hrs'),DECIMAL) BETWEEN 7 AND 9 THEN "AVARAGE"
			ELSE "ABOVE_AVARAGE"
		END
END AS label
FROM user_medical_histories m1 
LEFT JOIN user_medical_histories m2
 ON (m1.user_id = m2.user_id AND m1.class = m2.class AND m1.dated < m2.dated AND m2.deletedAt IS NULL)
JOIN users u ON m1.user_id = u.id
WHERE m2.id IS NULL AND m1.deletedAt IS NULL AND m1.user_id IS NOT NULL AND m1.class = 'sleep'
ORDER BY m1.user_id;
`
const bmi = `SELECT ${fullName}, u.gender, u.dob, m1.user_id, m1.bmi, m1.createdAt as dated,"" as device_type,
CASE
	WHEN m1.bmi < 18.5 THEN "UNDER_WEIGHT"
	WHEN m1.bmi BETWEEN 18.5 AND 25 THEN "FIT"
	WHEN m1.bmi BETWEEN 25 AND 30 THEN "OVER_WEIGHT"
	ELSE "OBESE"
END AS label
FROM user_medicals m1 
LEFT JOIN user_medicals m2
 ON (m1.user_id = m2.user_id AND m1.createdAt < m2.createdAt AND m2.deleted_at IS NULL)
JOIN users u ON m1.user_id = u.id
WHERE m2.id IS NULL AND m1.deleted_at IS NULL AND m1.user_id IS NOT NULL
ORDER BY m1.user_id;`

const bp = `SELECT ${fullName}, u.gender, u.dob, m1.*,
CASE
	WHEN CONVERT(JSON_EXTRACT(m1.response, '$.systolic'),DECIMAL) < 90 THEN "HYPOTESION"
	WHEN  CONVERT(JSON_EXTRACT(m1.response, '$.systolic'),DECIMAL) BETWEEN 90 AND 120 THEN "NORMAL"
	WHEN  CONVERT(JSON_EXTRACT(m1.response, '$.systolic'),DECIMAL) BETWEEN 120.01 AND 139 THEN "PREHYPERTENSION"
	WHEN  CONVERT(JSON_EXTRACT(m1.response, '$.systolic'),DECIMAL) BETWEEN 139.01 AND 159 THEN "HYPERTENSION_STAGE_1"
	ELSE "HYPERTENSION_STAGE_2"
END AS label
FROM user_medical_histories m1 
LEFT JOIN user_medical_histories m2
 ON (m1.user_id = m2.user_id AND m1.class = m2.class AND m1.dated < m2.dated AND m2.deletedAt IS NULL)
JOIN users u ON m1.user_id = u.id
WHERE m2.id IS NULL AND m1.deletedAt IS NULL AND m1.user_id IS NOT NULL AND m1.class = 'blood_pressure'
ORDER BY m1.user_id;`

module.exports = {
	up: (queryInterface, Sequelize) => {
		return Promise.all([
			queryInterface.sequelize.query(`CREATE or REPLACE view recent_walking_view as ${steps};`),
			queryInterface.sequelize.query(`CREATE or REPLACE view recent_spo2_view as ${spo2};`),
			queryInterface.sequelize.query(`CREATE or REPLACE view recent_temperature_view as ${temp};`),
			queryInterface.sequelize.query(`CREATE or REPLACE view recent_heart_rate_view as ${hr};`),
			queryInterface.sequelize.query(`CREATE or REPLACE view recent_sleep_view as ${sleep};`),
			queryInterface.sequelize.query(`CREATE or REPLACE view recent_bmi_view as ${bmi};`),
			queryInterface.sequelize.query(`CREATE or REPLACE view recent_blood_pressure_view as ${bp};`),
		])
	},
	down: (queryInterface, Sequelize) => {
		return Promise.resolve()
	}
};