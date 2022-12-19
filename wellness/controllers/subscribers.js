const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const static = require('../../config/static.json')

module.exports = {
    partners: async(req, res, next) => {
        let sql = `SELECT u.company_name,u.createdAt ,cnt.name country, u.email,u.phone_number,u.isd_code FROM usermeta um
    JOIN users u ON um.user_id = u.id AND u.deletedAt IS NULL
    LEFT JOIN countries cnt ON cnt.id = u.country_id
    WHERE JSON_EXTRACT(json_data,'$.wellnessPermission') = TRUE`;

        if (!!req.user.role && req.user.role == 5) {
            sql += ` AND u.id = ${req.user.id}`
        }

        db.sequelize.query(sql).spread((r, m) => res.send(r)).catch(e => res.status(400).send({ status: false, error: `${e}` }))
    },
    users: async(req, res, next) => {
        let params = req.params || {};
        let t = '';
        let t2 = '';
        let fullName = `CONCAT_WS(' ',u.first_name,NULLIF(u.middle_name,''),NULLIF(u.last_name,''),NULLIF(u.last_name_2,'')) AS fullName`;
        if (!!req.user.role && req.user.role == 5) {
            t = ` and c.clinic = ${req.user.id}`
            t2 = `where cl.clinic is not null`
        }
        let sql = `SELECT ${fullName}, u.id, u.createdAt ,cnt.name country, u.email,u.phone_number,u.isd_code, umh.*, cl.clinic,umh1.joinedAt  FROM users u
    JOIN (
      SELECT DISTINCT(user_id) user_id, device_type, createdAt lastSync FROM user_medical_histories WHERE device_type = '${params.device_type}' ORDER BY dated DESC
    ) umh ON umh.user_id = u.id
    left JOIN (
      SELECT DISTINCT(user_id) user_id, dated joinedAt FROM user_medical_histories WHERE device_type != 'Manual' GROUP BY user_id
    ) umh1 ON umh1.user_id = u.id
    LEFT JOIN (
      SELECT c.patient customer, u.company_name clinic FROM clinic_user_family_view c, users u , usermeta um 
      WHERE c.clinic = u.id AND um.user_id = u.id AND JSON_EXTRACT(json_data,'$.wellnessPermission') = TRUE ${t}
    ) cl ON cl.customer = u.id
    LEFT JOIN countries cnt ON cnt.id = u.country_id ${t2} GROUP BY id`;

        console.log(sql)

        db.sequelize.query(sql).spread((r, m) => res.send(r)).catch(e => res.status(400).send({ status: false, error: `${e}` }))
    }
}