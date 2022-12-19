const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

module.exports = {

    createParams: async (req, res, nex) => {
        let data = req.body || {};
        if (!data.gender || !data.label || !data.class) {
            return res.status(400).send({ status: false, error: `gender or label or class is missing` })
        }
        console.log(data);
        db.healthParam.findOrCreate({ where: { gender: data.gender, class: data.class, label: data.label } }).then(async (r) => {
            await r[0].update(data);
            return res.send(r[0])
        }).catch(e => res.status(400).send({ status: false, error: `${e}` }))
    },
    getParams: async (req, res, next) => {
        db.healthParam.findAll({ where: { class: req.params.class } }).then(ress => res.send(ress)).catch(e => res.status(400).send({ status: false, message: `${e}` }))
    },
    delete: async (req, res, next) => {
        console.log(req.params)
        db.healthParam.destroy({ where: { id: req.params.id } }).then(r => res.send({ status: true })).catch(e => res.status(400).send({ status: false, message: `${e}` }))
    }

};
