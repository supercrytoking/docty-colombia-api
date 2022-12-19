/* eslint-disable no-unused-vars */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse, responseObject } = require('../../commons/response');

async function snap(data) {
    if (data && data.user_id) {
        let sql = `SELECT COUNT(users.id)  AS employeesCount FROM users, customers WHERE users.id = customers.customer AND customers.user_id = ${data.user_id} and users.deletedAt IS NUll`;
        if (data.location_id) {
            sql += ` AND location_id = ${data.location_id}`;
        }
        return db.sequelize.query(sql).spread(resp => resp[0].employeesCount).catch(err => err);
    }
    return null;
}

module.exports = {
    dashboard: async(req, res, next) => {
        let cond = ' ';
        if (req.query && req.query.date) {
            cond = ` AND DATE(cc.createdAt) = DATE('${req.query.date}')`;
        }
        var location_id = null;
        if (req.query && req.query.location_id) {
            cond += ` AND c.location_id = '${req.query.location_id}' `;
            location_id = req.query.location_id;
        }

        let query = `SELECT cc.id id, cc.user_id user_id, cc.triage, cc.createdAt, cc.age, cc. gender, 
        CONCAT(u.first_name, ' ', u.last_name) fullName, u.phone_number, u.email,u.picture,
        a.landmark,a.city,a.state,a.country, a.latitude, a.longitude,
        c.location_id, l.title location
        FROM covid_checkers cc 
        join users u  on u.id = cc.user_id
        join customers c on cc.user_id = c.customer
        join locations l on  l.id = c.location_id
        left join addresses a on a.user_id = cc.user_id 
        WHERE c.user_id = ${req.user.id} ${cond}
        AND cc.id IN (SELECT MAX(id) as id FROM covid_checkers GROUP BY user_id)
        order by cc.createdAt desc;`;
        db.sequelize.query(query).spread(async(resp) => {
                let employeesCount = await snap({ user_id: req.user.id, location_id });
                res.send({ data: resp, employeesCount });
            })
            .catch(err => errorResponse(res, err));
    },

    sendAssessmentRequest: async(req, res, next) => {
        let q = `SELECT CONCAT(u.first_name, ' ', u.middle_name, ' ', u.last_name) userName, 
                u.email, c.customer, cc.id FROM users u
                JOIN customers c ON c.customer = u.id
                LEFT JOIN covid_checkers cc ON cc.user_id = u.id 
                WHERE c.user_id = ${req.user.id} AND cc.id IS NULL`;
        db.sequelize.query(q).spread(async resp => {
            let data = [];
            for (let r of resp) {
                let job = {
                    to: r.email,
                    userName: r.userName,
                    subject: req.body.subject,
                    text: req.body.text,
                    from: 'Docty.ai <noreply@docty.ai>',
                };
                data.push({
                    job: JSON.stringify(job),
                    status: 0,
                    attempt: 0,
                    type: 'email'
                });
            }
            if (!!data.length) {
                db.queue.bulkCreate(data).then(resp => {
                    return response(res, {}, 'SERVER_MESSAGE.SEND');
                }).catch(err => errorResponse(res, data));
            } else {
                return response(res, {});
            }
        }).catch(err => errorResponse(res, err));
    }
};