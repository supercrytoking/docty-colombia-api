const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");


module.exports = {
    async addService(req, res, next) {
        if (req.body.user_id) {
            let data = req.body;
            data['user_id'] = req.body.user_id;
            try {
                var where = { user_id: data.user_id, department_id: data.department_id, speciality_id: data.speciality_id }

                if (!!data.id) {
                    where.id = { [Op.ne]: data.id };
                }
                let user_service = await db.user_service.findOne({ where: where })
                if (user_service != null) {
                    throw 'ALREADY_SKILLS_EXIST'
                }
                let resp = await db.user_charge.upsert(data);
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
    async removeService(req, res, next) {
        if (req.body.id) {
            try {
                let resp = await db.user_charge.destroy({ where: { id: req.body.id } });
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
        }
        else {
            res.sendStatus(406)
        }
    },
    async services(req, res, next) {
        if (req.body.user_id) {
            db.user_charge.findAll({ where: { user_id: req.body.user_id } }).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                })
            })

        }
        else {
            res.sendStatus(406)
        }
    },
    async service(req, res, next) {
        if (req.body.id) {
            db.user_charge.findByPk(req.body.id).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                })
            })

        }
        else {
            res.sendStatus(406)
        }
    }
}