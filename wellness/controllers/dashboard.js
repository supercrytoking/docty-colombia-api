const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

module.exports = {
  activeDevicesSnap: async (user_id, role = null, queryData = {}) => {
    let sbq = '';
    let clinic = null;
    if (role == 2) return {};
    if (role == 5 || role == 'clinic') {
      clinic = user_id
    } else {
      clinic = queryData.clinic || null;
    }
    if (!!clinic) {
      sbq = `JOIN clinic_user_family_view cuf ON cuf.patient = umh.user_id AND cuf.clinic in (${clinic})`
    }

    let sql = `SELECT COUNT(DISTINCT(umh.user_id)) ct, device_type, DATE(dated) dated FROM user_medical_histories umh
    ${sbq}
    WHERE device_type ${!!queryData.device_type ? "= '" + queryData.device_type + "'" : "!='Manual'"} 
    AND DATE(dated) >= DATE("${queryData.startDate.toISOString()}") AND DATE(dated) <= DATE("${queryData.endDate.toISOString()}")
    GROUP BY device_type, DATE(dated)`;
    console.log(sql)
    let data = await db.sequelize.query(sql).spread((r, m) => {
      let obj = {};
      r.forEach(element => {
        obj[element.device_type] = obj[element.device_type] || { name: element.device_type, series: [] }
        obj[element.device_type].series.push({ name: element.dated, value: element.ct })
      });
      return Object.values(obj);
    });
    return data;
  },
  healthStatStics: (user_id, role = null, queryData = {}) => {
    let classes = ['heart_rate', 'blood_pressure', 'sleep', 'walking', 'spo2', 'temperature', 'bmi'];
    let promises = [];
    let obj = {};
    if (role == 2) return {};

    let clinic = null;
    if (role == 5 || role == 'clinic') {
      clinic = user_id
    } else {
      clinic = queryData.clinic || null;
    }
    let sbq = "";
    if (!!clinic) {
      sbq = `JOIN clinic_user_family_view cuf ON cuf.patient = v.user_id AND cuf.clinic in (${clinic})`
    }
    classes.forEach(e => {
      let sql = `SELECT COUNT(v.user_id) as total,label FROM recent_${e}_view v
      ${sbq}
      WHERE  device_type ${!!queryData.device_type ? "= '" + queryData.device_type + "'" : "!='Manual'"}
      AND DATE(dated) >= DATE("${queryData.startDate.toISOString()}") AND DATE(dated) <= DATE("${queryData.endDate.toISOString()}")  
      GROUP BY label`;
      promises.push(
        db.sequelize.query(sql)
          .spread((r, m) => {
            return { type: e, data: r }
          })
      )
    })

    let crq = `SELECT COUNT(user_id) total,JSON_EXTRACT(response,'$.cronic_condition') AS label FROM user_medical_histories v
    ${sbq}
    JOIN users ON users.id = v.user_id AND users.deletedAt IS NULL
    WHERE class = "cronic_condition" AND v.deletedAt IS NULL AND v.STATUS = 1
    AND DATE(dated) >= DATE("${queryData.startDate.toISOString()}") AND DATE(dated) <= DATE("${queryData.endDate.toISOString()}")  
    GROUP BY JSON_EXTRACT(response,'$.cronic_condition')`;
    promises.push(
      db.sequelize.query(crq)
        .spread((r, m) => {
          return { type: 'cronic_condition', data: r }
        })
    )
    return Promise.all(promises);
  },
  stepsStatics: (user_id, role = null, queryData = {}) => {
    if (role == 2) return {};

    let clinic = null;
    if (role == 5 || role == 'clinic') {
      clinic = user_id
    } else {
      clinic = queryData.clinic || null;
    }
    let sbq = "";
    if (!!clinic) {
      sbq = `JOIN clinic_user_family_view cuf ON cuf.patient = user_medical_histories.user_id AND cuf.clinic in (${clinic})`
    }
    let sql = `SELECT user_id,response,DATE_FORMAT(dated,"%d %M") dated FROM user_medical_histories
    ${sbq}
    WHERE 
    device_type ${!!queryData.device_type ? "= '" + queryData.device_type + "'" : "!='Manual'"} AND class="walking"
    AND DATE(dated) >= DATE("${queryData.startDate.toISOString()}") AND DATE(dated) <= DATE("${queryData.endDate.toISOString()}")  ORDER BY dated ASC`;
    return db.sequelize.query(sql)
      .spread((r, m) => {
        let data = {};
        r.forEach(element => {
          if (!data[element.dated]) data[element.dated] = {
            name: element.dated,
            series: [
              { name: 'Complete', value: 0 },
              { name: "Goals", value: 0 }
            ]
          }
          data[element.dated].series[0].value += 1;
          if (element.response.target_steps >= element.response.walked_steps) {
            data[element.dated].series[1].value += 1;
          }
        })
        return Object.values(data)
      }).catch(e => [])

  },
  dashboard: async (req, res, next) => {
    let { id, role } = req.user;
    if (role == 5) {
      let sq = `SELECT * FROM usermeta WHERE JSON_EXTRACT(json_data,'$.wellnessPermission') = TRUE  AND user_id = ${id}`;
      let permission = await db.sequelize.query(sq).spread((r, m) => r[0]).catch(e => null);
      if (!!!permission) return res.send({ activeDevicesGraph: [], stepsStatics: [], healthStatStics: [] })
    }
    let query = req.query;
    let endDate = !!query.endDate ? new Date(query.endDate) : new Date();
    let startDate = !!query.startDate ? new Date(query.startDate) : new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 15);
    let queryData = { startDate, endDate, device_type: (query.device_type || null), clinic: (query.clinic || null) };
    let activeDevicesGraph = await module.exports.activeDevicesSnap(id, role, queryData);
    let stepsStatics = await module.exports.stepsStatics(id, role, queryData);
    let healthStatStics = await module.exports.healthStatStics(id, role, queryData);
    res.send({ activeDevicesGraph, stepsStatics, healthStatStics })
  }
}