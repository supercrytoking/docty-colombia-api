const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const static = require('../../config/static.json')

module.exports = {
    userInfo: async(req, res, next) => {
        let where = {};
        let params = req.params || {};
        if (params.userId) {
            where.id = params.userId;
        } else if (req.user.role == 2) {
            where.id = req.user.id;
        }
        let user = await db.user.scope('minimalInfo', 'emergencycontactInfo').findOne({
            where,
            include: ['emergency_contact_person']
        });
        user = JSON.parse(JSON.stringify(user));
        if (!!user && !!user.emergency_contact_person) {
            let sq = `SELECT relation,user_id FROM user_kindreds WHERE (user_id = ${user.id} AND member_id = ${user.emergency_contact}) 
        OR (user_id = ${user.emergency_contact} AND member_id = ${user.id})`
            let rel = await db.sequelize.query(sq).spread((r, m) => r[0] || {}).catch(e => {});
            if (!!rel.relation) {
                let relation = rel.user_id == user.id ? rel.relation : static.reverseRelation[user.gender][rel.relation];
                user.emergency_contact_person['relation'] = relation
            }
        }
        let snap = { blood_pressure: {}, walking: {}, spo2: {}, heart_rate: {}, temperature: {}, cronic_condition: {} };
        let arr = ["blood_pressure", "sleep", "spo2", "heart_rate", "temperature", 'bmi'];
        let promss = [];
        arr.forEach(e => {
            let sq = `SELECT device_type,${e != "bmi" ? 'response' : "JSON_OBJECT('bmi',bmi)"} response,label,dated FROM recent_${e}_view WHERE user_id =  ${where.id}`;
            promss.push(db.sequelize.query(sq).spread((r, m) => { return { key: `${e}`, data: r[0] || {} } }))
        });

        // for steps

        let sq1 = `SELECT device_type, response,label,dated,total_walked FROM recent_walking_view WHERE user_id =  ${where.id}`;
        promss.push(db.sequelize.query(sq1).spread((r, m) => {
            let data = r[0];
            if (data && data.response)
                data.response.walked_steps = data.total_walked;
            return { key: `walking`, data: data }
        }));
        // for steps end

        promss.push(db.sequelize.query(`SELECT response,dated FROM recent_cronic_condition_view WHERE user_id =  ${where.id}`).spread((r, m) => {
            if (!!r[0] && typeof r[0].response == 'string') r[0] = JSON.parse(r[0].response)
            return {
                key: `cronic_condition`,
                data: r[0] || {}
            }
        }))

        snap = await Promise.all(promss).then(r => {
            let d = {};
            r.forEach(e => {
                d[e.key] = e.data
            });
            return d;
        });

        let device_status = await db.device_status.findOne({ where: { user_id: user.id } }).then(r => {
            if (r)
                return { device_type: r.device_type || '', ...(r.device_status || {}) };
            return {}
        });
        let weather = await db.weather.findOne({ where: { user_id: user.id } }).then(r => {
            if (!!r) return r.weather || {};
            return {};
        });


        user.dataSnap = snap;
        // user.lastDevice = lastDevice;
        user.weather = JSON.parse(JSON.stringify(weather));
        user.device_status = JSON.parse(JSON.stringify(device_status));
        res.send(user)
    },
    histories: async(req, res, next) => {
        let where = {};
        let query = req.query || {};
        let order = ['dated', 'desc'];
        let params = req.params || {};
        if (params.class && params.class !== 'all') {
            where.class = params.class;
        }
        if (params.class == 'all') {
            where.class = {
                [Op.in]: ["blood_pressure", "cronic_condition", "heart_rate", "sleep", "spo2", "temperature", "walking"]
            };
        }
        if (params.user_id) {
            where.user_id = params.user_id;
        } else if (req.user.role == 2) {
            where.user_id = req.user.id;
        }

        if (!!query.classes) {
            let classess = query.classes.split(',');
            if (!!classess.length) {
                where.class = {
                    [Op.in]: classess
                }
            }
        }
        db.userMedicalHistory.findAll({
            where: where,
            order: [order, ['createdAt', 'desc']],
            include: [{
                model: db.user.scope(''),
                as: 'added_by_user',
                attributes: ['first_name', 'middle_name', 'last_name', 'last_name_2', 'company_name', 'fullName']
            }],
        }).then(resp => res.send(resp)).catch(e => res.status(400).send({ status: false, error: `${e}` }))
    },
    bmi: async(req, res, next) => {
        let params = req.params || {};
        let user_id = null;
        if (params.user_id) {
            user_id = params.user_id;
        } else if (req.user.role == 2) {
            user_id = req.user.id;
        }
        db.user_medical.findAll({
            where: { user_id },
            include: ['change_by_user', 'added_by_admin_user'],
            paranoid: false,
            attributes: ['createdAt', 'bmi', 'user_id', 'bmiLabel']
        }).then(r => res.send(r)).catch(e => res.status(400).send({ status: false, message: `${e}` }))
    },
    users: async(req, res, mext) => {
        let params = req.params || {};
        let query = req.query || {};
        let table = `recent_${params.view}_view`;
        let sq = '';
        if (req.user.role == 5) {
            sq = `JOIN clinic_user_family_view cuf ON cuf.patient = t.user_id AND cuf.clinic = ${req.user.id}`
        }
        let sql = `Select *,CONVERT(ROUND(DATEDIFF(CURRENT_TIMESTAMP, dob)/365.25),UNSIGNED INTEGER) AS age from ${table} t
    ${sq} 
    where device_type != 'Manual'`
        if (!!params.label) {
            sql += ` and label = '${params.label}'`
        }
        if (!!query.startDate) {
            sql += ` and DATE(dated) >= DATE("${query.startDate}")`
        }
        if (!!query.endDate) {
            sql += ` and DATE(dated) >= DATE("${query.endDate}")`
        }
        console.log(sql)
        db.sequelize.query(sql).spread((r, m) => res.send(r)).catch(e => res.status(400).send({ status: false, error: `${e}` }))
    },
    cronic_condition: async(req, res, next) => {
        let params = req.params || {};
        let query = req.query || {};
        let sq = '';
        if (req.user.role == 5) {
            sq = `JOIN clinic_user_family_view cuf ON cuf.patient = u.id AND cuf.clinic = ${req.user.id}`
        }
        let sql = `SELECT CONCAT_WS(' ',u.first_name,NULLIF(u.middle_name,''),NULLIF(u.last_name,''),NULLIF(u.last_name_2,'')) AS fullName, 
    JSON_EXTRACT(response,'$.cronic_condition') as label,
   u.dob, u.gender, CONVERT(ROUND(DATEDIFF(CURRENT_TIMESTAMP, dob)/365.25),UNSIGNED INTEGER) AS age, umh.* FROM user_medical_histories umh
   JOIN users u ON umh.user_id = u.id AND u.deletedAt IS NULL
   ${sq}
   WHERE class = "cronic_condition" AND umh.deletedAt IS NULL AND umh.status = 1`
        db.sequelize.query(sql).spread((ress, m) => res.send(ress)).catch(e => res.status(400).send({ status: false, error: `${e}` }))
    }
}