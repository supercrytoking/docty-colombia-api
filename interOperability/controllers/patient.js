const db = require("../../models")
const { getLimitOffset, limit } = require("../../commons/paginator");
const {
  response,
  errorResponse,
  responseObject,
} = require("../../commons/response");

const getPatients = async (req, res, next) => {
  let path = (req.path || '').replace(/\//g, '');
  let params = req.params;
  let search = "";
  let page = 1;
  let orderKey = "createdAt";
  let order = "desc";
  let pageSize = 25;
  let where = { status: true };
  let offset = 0;
  let data = {};
  if (req.body || req.query) {
    data = req.body || req.query;
    search = data.search || "";
    orderKey = data.orderKey || "createdAt";
    order = data.order || "desc";
    page = data.page || 1;
    pageSize = data.pageSize || 25;
  }
  if (data.hasOwnProperty('limit')) {
    pageSize = data.limit;
  }
  if (!!pageSize && !!page) {
    offset = (page - 1) * pageSize;
  }
  let sqlCount = `
            SELECT COUNT(id) FROM (
            SELECT  u.id
            FROM users u
            JOIN bookings b ON b.patient_id = u.id
            JOIN associates a ON a.associate = b.provider_id
            LEFT JOIN customers c ON c.customer = b.patient_id
            WHERE  c.id IS NULL AND a.user_id = 196 AND u.deletedAt IS NULL
            GROUP BY u.id
            ) AS t`;
  let sql = `
            SELECT  u.id,u.first_name, u.last_name, u.middle_name, u.gender, u.dob, u.picture, u.isd_code, 
            u.phone_number, u.email, u.createdAt,u.updatedAt,u.city_code city_code, um.bmi, um.blood_group,c.ips_code,
            vsa.id analysis_id, JSON_EXTRACT(vsa.tirage,'$.triage_level') triage_level FROM users u `;
  switch (path) {
    case 'customers':
      sql += `        
        JOIN customers c ON c.customer = u.id
        LEFT JOIN user_medicals um ON um.user_id = u.id AND um.deleted_at IS NULL
        LEFT JOIN view_symptom_analysis vsa ON vsa.user_id = u.id 
        WHERE c.user_id `;
      sqlCount = `SELECT COUNT(u.id) total FROM users u,customers c WHERE u.id = c.customer AND c.user_id = ${req.user.id} AND u.status = 1`;
      break;
    case 'favorittens':
      sql += `
        JOIN my_favorites mf ON mf.user_id = u.id
        LEFT JOIN customers c ON c.customer = u.id
        LEFT JOIN user_medicals um ON um.user_id = u.id AND um.deleted_at IS NULL
        LEFT JOIN view_symptom_analysis vsa ON vsa.user_id = u.id 
        WHERE mf.provider_id `;
      sqlCount = `SELECT COUNT(id) total FROM my_favorites WHERE provider_id = ${req.user.id} and deletedAt IS NULL`;
      break;
    case 'docty-customers':
      sql += ` JOIN bookings b ON b.patient_id = u.id
        JOIN associates a ON a.associate = b.provider_id
        LEFT JOIN customers c ON c.customer = b.patient_id
        LEFT JOIN view_symptom_analysis vsa ON vsa.user_id = u.id
        LEFT JOIN user_medicals um ON um.user_id = u.id AND um.deleted_at IS NULL
        WHERE  c.id IS NULL AND a.user_id `;
      sqlCount = `
            SELECT COUNT(id) total FROM (SELECT  u.id FROM users u
            JOIN bookings b ON b.patient_id = u.id
            JOIN associates a ON a.associate = b.provider_id
            LEFT JOIN customers c ON c.customer = b.patient_id
            WHERE  c.id IS NULL AND a.user_id = ${req.user.id} AND u.deletedAt IS NULL
            GROUP BY u.id) AS t`;
      break;
    default:
  }
  sql += ` = ${req.user.id}
  AND u.deletedAt IS NULL
  AND u.status = 1 `;
  if (!!search) {
    sql += ` AND CONCAT(COALESCE(u.first_name,''), COALESCE(u.last_name,''), COALESCE(u.middle_name,''), COALESCE(u.phone_number,''), COALESCE(u.email,''),COALESCE(u.last_name_2,'')) LIKE "%${search}%"`;
  }
  if (!!data.name) {
    sql += ` AND CONCAT(COALESCE(u.first_name,''), COALESCE(u.last_name,''), COALESCE(u.middle_name,''),COALESCE(u.last_name_2,'')) LIKE "%${data.name}%"`;
  }

  if (!!data.born_before_date) {
    sql += ` AND DATE(u.dob) <= DATE('${data.born_before_date}')`;
  }
  if (!!data.blood_group) {
    sql += ` AND um.blood_group = '${data.blood_group}'`;
  }
  if (!!data.born_after_date) {
    sql += ` AND DATE(u.dob) >= DATE('${data.born_after_date}')`;
  }

  if (!!data.gender) {
    sql += ` AND u.gender = '${data.gender}'`;
  }
  if (!!data.email) {
    sql += ` AND u.email LIKE '%${data.email}%'`;
  }
  if (!!data.phone_number) {
    sql += ` AND u.phone_number LIKE '%${data.phone_number}%'`;
  }
  if (!!data.city_code) {
    sql += ` AND u.city_code = '${data.city_code}'`;
  }

  if (!!data.bmi) {
    if (data.bmi == 'fit') {
      sql += ` AND um.bmi >= 18.5 AND um.bmi <= 25`;
    }
    if (data.bmi == 'underWeight') {
      sql += ` AND um.bmi < 18.5`;
    }
    if (data.bmi == 'overWeight') {
      sql += ` AND um.bmi >= 25 AND um.bmi <= 30`;
    }
    if (data.bmi == 'obese') {
      sql += ` AND um.bmi > 30`;
    }
  }

  if (!!data.createdAt) {
    sql += ` AND DATE(u.createdAt) >= DATE('${data.createdAt}')`;
  }

  if (!!data.triage) {
    sql += ` AND JSON_EXTRACT(vsa.tirage,'$.triage_level') LIKE '%${data.triage}%'`;
  }

  sql += `  GROUP BY u.id  ORDER BY ${orderKey} ${order} `;
  if (!!pageSize) {
    sql += ` LIMIT ${offset}, ${pageSize}`;
  }
  db.sequelize
    .query(sql)
    .spread(async (resp) => {
      let users = JSON.parse(JSON.stringify(resp));
      let ids = users.map((e) => e.id);
      let idsStr = ids.join(",");
      let OneYearAgo = new Date(
        new Date().setFullYear(new Date().getFullYear() - 1)
      ).toISOString();

      let t1 = `SELECT  JSON_OBJECT("platform", platform, "createdAt", created_at) AS lastLogin, user_id FROM tokens t 
      WHERE id IN(SELECT MAX(id) AS id FROM tokens WHERE user_id IN(${idsStr}) GROUP BY user_id)
      GROUP BY user_id`;
      // let t2 = `SELECT  JSON_OBJECT("response", response, "updatedAt", updatedAt) medical_conditions, user_id FROM user_medical_conditions umc
      // where id in (SELECT MAX(id) id WHERE user_id IN(${idsStr}) AND deleted_at IS NULL GROUP BY user_id)
      // GROUP BY user_id`;
      let t3 = `SELECT COUNT(id) AS bookingCounts, patient_id FROM bookings 
      WHERE patient_id IN (${idsStr}) AND DATE(createdAt) > DATE("${OneYearAgo}")
      GROUP BY patient_id`;
      // let t4 = `SELECT JSON_EXTRACT(tirage,'$.triage_level') triage_level, id analysis_id, conditions,user_id 
      // FROM symptom_analysis WHERE id IN (SELECT MAX(id) FROM symptom_analysis WHERE user_id IN (${idsStr}) GROUP BY user_id)`;
      let t5 = `SELECT COUNT(id) familyCount, user_id FROM user_families WHERE user_id IN (${idsStr}) GROUP BY user_id`;
      let queries = await Promise.all([
        db.sequelize.query(t1).spread((resp, r) => {
          let d = {};
          resp.forEach(e => { d[e.user_id] = e.lastLogin; });
          return d;
        }).catch(e => { }),
        // db.sequelize.query(t2).spread((resp, r) => {
        //   let d = {};
        //   resp.forEach(e => { d[e.user_id] = e.medical_conditions; });
        //   return d;
        // }).catch(e => { }),
        db.sequelize.query(t3).spread((resp, r) => {
          let d = {};
          resp.forEach(e => { d[e.patient_id] = e.bookingCounts; });
          return d;
        }).catch(e => { }),
        // db.sequelize.query(t4).spread((resp, r) => {
        //   let d = {};
        //   resp.forEach(e => {
        //     d[e.user_id] = {
        //       triage_level: e.triage_level,
        //       analysis_id: e.analysis_id,
        //       conditions: e.conditions
        //     };
        //   });
        //   return d;
        // }).catch(e => { }),
        db.sequelize.query(t5).spread((resp, r) => {
          let d = {};
          resp.forEach(e => { d[e.user_id] = e.familyCount; });
          return d;
        }).catch(e => { }),
        db.sequelize.query(sqlCount).spread((resp, r) => {
          return resp[0].total;
        }).catch(e => { })
      ]);
      if (queries && queries.length) {
        users.forEach((r) => {
          // r.medical_conditions = queries[1][r.id] || {};
          r.lastLogin = queries[0][r.id] || {};
          r.bookings_in_year = queries[1][r.id] || 0;
          let ob = queries[2][r.id] || {};
          // r = Object.assign(r, ob);
          // r.familyCount = queries[4][r.id] || 0;
        });
      }
      let g = pageSize || users.length;
      let ct = !!pageSize ? queries[2] : g;
      response(res, { rows: users, count: ct }, null, g);
    })
    .catch((e) => {
      errorResponse(res, e);
    });
}

const getPatient = async (req, res, next) => {
  return res.send('praparing json')
}

function calcBmi(w, wu, h, hu) {
  if (!!w && !!h) {
    if (hu == 'inch') {
      h = 2.54 * h
    }
    if (wu == 'lbs') {
      w = 0.453592 * w
    }
    return parseFloat(w) / ((parseFloat(h) / 100) * (parseFloat(h) / 100))
  }
  return null;
}
const savePatient = async (req, res, next) => {
  let data = req.body || {};
  let errors = {};
  if (data.ips_code == 0 || data.ips_code == '0') data.ips_code = null;
  if (!!!data.ips_code) {
    errors.ips_code = 'required'
  }
  if (!!!data.first_name) {
    errors.first_name = 'required'
  }
  if (!!data.phone_number && !!!data.isd_code) {
    errors.isd_code = 'required'
  }
  if (!!data.blood_group &&
    !!!['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-']
      .includes(data.blood_group.toUpperCase())) {
    errors.blood_group = 'Acceptable values A+ , B+, AB+ ,O+, A -, B-, AB-, O-';
  }

  if (!!data.gender &&
    !!!['MALE', 'FEMALE', 'OTHER']
      .includes(data.gender.toUpperCase())) {
    console.log(['MALE', 'FEMALE', 'OTHER']
      .includes(data.gender.toUpperCase()))
    errors.gender = 'Acceptable values MALE, FEMALE,OTHER';
  }

  if (!!data.weight && !!!data.weight_unit) {
    errors.weight_unit = 'required';
  }
  if (!!data.height && !!!data.height_unit) {
    errors.height_unit = 'required';
  }
  if (!!Object.keys(errors).length) {
    res.status(500).send({ errors });
  }

  if (!!data.weight_unit &&
    !!!['KG', 'LBS']
      .includes(data.weight_unit.toUpperCase())) {
    errors.weight_unit = 'Acceptable values kg, lbs';
  }
  if (!!data.height_unit &&
    !!!['CM', 'INCH']
      .includes(data.height_unit.toUpperCase())) {
    errors.height_unit = 'Acceptable values cm, inch';
  }
  if (!!data.id_proof_serial && !!!data.id_proof_type) {
    errors.id_proof_type = 'required'
  }
  if (!!data.id_proof_type && !!!data.id_proof_serial) {
    errors.id_proof_serial = 'required'
  }
  if (!!Object.keys(errors).length) {
    res.status(500).send({ errors });
    return;
  }

  let object = {
    first_name: data.first_name,
    last_name: data.last_name,
    middle_name: data.middle_name,
    last_name_2: data.last_name_2,
    email: data.email,
    phone_number: data.phone_number,
    isd_code: data.isd_code,
    ips_code: data.ips_code,
    id_proof_type: (data.id_proof_type || '').toUpperCase(),
    national_id: data.id_proof_serial,
    gender: (data.gender || '').toUpperCase(),
    city_code: data.city_code,
    dob: new Date(data.dob),
    user_medical: {
      height: data.height,
      weight: data.weight,
      height_unit: data.height_unit,
      weight_unit: data.weight_unit,
      blood_group: data.blood_group,
      bmi: calcBmi(data.weight, data.weight_unit, data.height, data.height_unit)
    },
    address: {
      address: data.formated_address,
      city: data.city,
      state: data.state,
      country: data.country,
      zip: data.city_code,
      landmark: data.landmark,
      latitude: data.latitude,
      longitude: data.longitude
    }
  };

  try {
    let u = null;
    let customer = await db.customer.findOne({
      where: { ips_code: object.ips_code, user_id: req.user.id }
    })
    if (!!customer) {
      object.id = customer.customer;
      object.address.user_id = customer.customer;
      object.user_medical.user_id = customer.customer;
      u = await db.user.upsert(object);
      await db.address.findOrCreate({
        where: { user_id: customer.customer }
      }).then(resp => {
        return db.address.update(object.address, { where: { user_id: customer.customer } })
      });
      await db.user_medical.findOrCreate({
        where: { user_id: customer.customer }
      }).then(resp => {
        return db.user_medical.update(object.user_medical, { where: { user_id: customer.customer } })
      });
    } else {
      object.customer = {
        user_id: req.user.id,
        ips_code: object.ips_code
      }
      u = await db.user.create(object, {
        include: ['user_medical', 'address', 'customer']
      })
    }
    res.send({
      status: true,
      message: u ? 'user created successfuly' : "user updated successfuly",
    })
  } catch (error) {
    res.status(500).send({
      status: false,
      error: `${error}`
    })
  }
}


module.exports = {
  getPatients, getPatient, savePatient
}