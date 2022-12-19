const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {
    getDiagnostic: async (req, res, next) => {
        var where = {
            status: 1,
            [Op.or]:
                [
                    { title: { [Op.like]: `%${req.body.title}%` } },
                    { cie_3_char: { [Op.like]: `%${req.body.title}%` } },
                    { cie_4_char: { [Op.like]: `%${req.body.title}%` } },
                    { discription: { [Op.like]: `%${req.body.title}%` } },
                ]
        }

        db.diagnostic.findAll({ where: where, limit: 40 }).then(resp => {
            res.send(resp)
        }).catch(err => {
            console.log(err)
            res.status(400).send({
                errors: `${err}`,
                success: false
            })
        })
    },
    addDiagnostic: async (req, res, next) => {
        let data = req.body;
        if (req.user && req.user.id) {
            try {
                let resp = await db.diagnostic.upsert(data);
                res.send({
                    status: true,
                    data: resp
                })
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: error
                })
            }
        } else {
            res.sendStatus(406)
        }
    },
    getProcedures: async (req, res, next) => {
        var where = {
            process: { [Op.like]: `%${req.body.process}%` },
            status: 1
        }

        if (req.body.speciality_type) where.speciality_type = req.body.speciality_type;

        db.procedure.findAll({ where: where }).then(resp => {
            res.send(resp)
        }).catch(err => {
            console.log(err)
            res.status(400).send({
                errors: `${err}`,
                success: false
            })
        })
    }
}