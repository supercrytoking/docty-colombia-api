const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

module.exports = {

    professionalDetails: async (req, res, next) => {
        var user_id = req.params.userid;
        let sq = `SELECT pd.* FROM professional_details AS pd, customers c
            WHERE pd.user_id = c.customer AND c.user_id = ${req.user.id} AND pd.user_id = ${user_id}`;
        db.sequelize.query(sq).spread((r, m) => res.send(r[0])).catch(e => res.status(400).send({ error: e, status: false }))
    },
    professionalDetailsSave: async (req, res, next) => {
        var data = req.body || {};
        data.company_id = req.user.id;
        let sq = `SELECT customer FROM  customers c WHERE c.user_id = ${req.user.id} AND c.customer = ${data.user_id}`;
        let c = await db.sequelize.query(sq).spread((r, m) => r[0]);
        if (!!!c) {
            return res.status(401).send({ status: false, error: 'unauthorized' })
        }
        db.professional_detail.findOrCreate({ where: { user_id: data.user_id } })
            .then(r => {
                r[0].update(data);
                return r[0];
            })
            .then(r => res.send(r))
            .catch(e => res.status(400).send({ error: e, status: false }))
    },

    designations: async (req, res) => {
        // db.coporateDisignation.findAll({ where: { user_id: req.user.id } })
        //     .then(r => res.send(r)).catch(e => res.status(400).send({ error: e, status: false }))
        db.sequelize.query(`
        SELECT pd.users, cd.designation, cd.id, cd.risk_factors FROM coporateDisignations cd
        LEFT JOIN (
          SELECT  COUNT(user_id) users, designation, company_id FROM professional_details pd WHERE company_id = ${req.user.id} AND designation IS NOT NULL
           GROUP BY designation
        ) AS pd ON  pd.designation = cd.id
        WHERE cd.user_id = ${req.user.id}
        `)
            .spread((r, m) => res.send(r)).catch(e => res.status(400).send({ error: e, status: false }))
    },
    designationsave: async (req, res) => {
        let data = req.body || {};
        if (!!data.id) {
            db.coporateDisignation.upsert(data)
                .then(async (r) => {
                    res.send({ status: true })
                }).catch(e => res.status(400).send({ error: `${e}`, status: false }))

        } else {
            db.coporateDisignation.findOrCreate({ where: { designation: data.designation, user_id: req.user.id } })
                .then(async (r) => {
                    await r[0].update(data)
                    res.send(r[0])
                }).catch(e => res.status(400).send({ error: `${e}`, status: false }))
        }

    },
    designationsdelete: async (req, res) => {
        let id = req.params.id;
        db.coporateDisignation.destroy({ where: { id, user_id: req.user.id } })
            .then(r => res.send({ data: r })).catch(e => res.status(400).send({ error: e, status: false }))
    },

    searchUser: async (req, res) => {
        const fullName = `CONCAT_WS(' ',u.first_name,NULLIF(u.middle_name,''),NULLIF(u.last_name,''),NULLIF(u.last_name_2,'')) AS fullName`;
        const cond = `CONCAT_WS(' ',u.first_name,NULLIF(u.middle_name,''),NULLIF(u.last_name,''),NULLIF(u.last_name_2,''))`;
        let search = req.body.search || ""
        let sql = `SELECT ${fullName},u.id, pd.designation FROM users u
        JOIN customers c ON c.customer = u.id
        LEFT JOIN (
            SELECT p.user_id, d.designation FROM professional_details p, coporateDisignations d WHERE  p.designation = d.id
        ) pd ON pd.user_id = u.id
        WHERE c.user_id = ${req.user.id}
        AND (${cond} LIKE "%${search}%" OR pd.designation LIKE "%${search}%" OR u.id = "${search}")
        `;
        console.log(sql);
        db.sequelize.query(sql).spread((r, m) => res.send(r)).catch(e => res.status(400).send({ error: e, status: false }))
    }

}