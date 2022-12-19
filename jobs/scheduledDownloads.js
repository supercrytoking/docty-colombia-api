const { sendMail } = require('./mailer');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const { Parser, parse } = require("json2csv");
const db = require("../models");
const { otpTrigger } = require('../commons/crmTrigger');

module.exports.patientListOfClinic = async () => {
  let jobsO = await db.queue.findAll({
    where: { type: 'downloadPatientListOfClinic', attempt: { [Op.lt]: 5 }, status: 0 },
    limit: 10
  });
  jobsO.forEach(e => {
    e.update({ status: 1 });
  });
  let jobs = JSON.parse(JSON.stringify(jobsO));
  if (!!jobs && !!jobs.length) {
    let headers = [
      "First Name",
      "Middle Name",
      "Last Name",
      "2nd Last Name",
      "Id Proof Type",
      "National Id",
      "DOB",
      "Gender",
      "IPS COde",
      "Address",
      "City Code",
      "Country",
      "Country Of Birth",
      "Phone Number",
      "Telephone 1",
      "Telephone 2",
      "HTA_Dx",
      "Diabetes_Dx",
      "YES_Dx",
      "Weight",
      "Height",
      "TA_Sistolic",
      "TA_Diastolic",
      "Waist_Perimeter",
      "Email",
    ];
    for (let i = 0; i < jobs.length; i++) {
      let jobObj = jobs[i];
      let job = jobObj.job;
      if (typeof job == 'string') job = JSON.parse(job);
      var user_id = job.user_id;
      let sql = `SELECT DISTINCT(u.id),u.first_name "First Name",u.last_name 
        "Last Name",u.middle_name "Middle Name",u.last_name_2 "2nd Last Name",
        u.id_proof_type "Id Proof Type",u.national_id "National Id",
        u.gender "Gender",u.dob DOB,u.city_code "City Code",
        (SELECT NAME FROM countries WHERE id = u.country_id) Country,
        (SELECT NAME FROM countries WHERE id = u.country_of_birth) "Country Of Birth",
        u.phone_number "Phone Number",u.telephone_1 "Telephone 1",u.telephone_2 "Telephone 2",
        u.email Email,c.ips_code "IPS Code",um.height Height,um.weight Weight,um.blood_group "Blood Group",umc.response,
        a.address Address
        FROM users u
        LEFT JOIN customers c ON c.customer = u.id
        LEFT JOIN user_medicals um ON c.customer = um.user_id
        LEFT JOIN addresses a ON a.user_id = c.customer
        LEFT JOIN user_medical_conditions umc ON umc.user_id = c.customer
        WHERE c.user_id = ${user_id}
        AND u.deletedAt IS NULL 
        AND um.deleted_at IS NULL
        AND umc.deleted_at IS NULL`;

      db.sequelize
        .query(sql)
        .spread((resp) => {
          var user_list = JSON.parse(JSON.stringify(resp));
          user_list.forEach((e) => {
            if (typeof e.response == 'string') e.response = JSON.parse(e.response);
            (e.response || []).map((r) => {
              e[r.name] = r.input || r.result;
            });
          });

          const fields = headers;
          const opts = { fields };
          const csv = parse(user_list, opts);
          otpTrigger('downloadPatientListOfClinic',
            {
              email: job.email,
              subject: job.subject || 'Patient list',
              userName: job.userName,
              attachments: [{
                filename: 'patients.csv',
                content: Buffer.from(csv, 'utf-8')
              }]
            }, job.lang
          ).then(e => {
            // console.log('s', e);
            db.queue.destroy({ where: { id: jobObj.id } });
          }
          ).catch(e => {
            // console.log(e);
            db.queue.update({ attempt: (jobObj.attempt + 1) }, { where: { id: jobObj.id } });
          }
          );
        })
        .catch((err) => {
          db.queue.update({ attempt: (jobObj.attempt + 1) }, { where: { id: jobObj.id } });
        });
    }

  } else {
    return;
  }
};

// module.exports.patientListOfClinic();