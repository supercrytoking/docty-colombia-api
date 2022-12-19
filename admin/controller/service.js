const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { addActivityLog } = require('./activityLog');
const { calculateServicePrice } = require('../../commons/helper');

module.exports = {
    async addService(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            // data['user_id'] = req.user.id;
            try {
                var where = { user_id: data.user_id, department_id: data.department_id, speciality_id: data.speciality_id }

                if (!!data.id) {
                    where.id = { [Op.ne]: data.id };
                }
                let user_service = await db.user_service.findOne({ where: where })
                if (user_service != null) {
                    throw 'ALREADY_SKILLS_EXIST'
                }
                let resp = await db.user_service.upsert(data);
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
            addActivityLog({ user_id: req.user.id, type: 'user skills updated' });
        } else {
            res.sendStatus(406)
        }

    },
    async addUserService(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = data.user_id;
            var where = { user_id: data.user_id, department_id: data.department_id, speciality_id: data.speciality_id };

            if (!!data.id) {
                where.id = { [Op.ne]: data.id };
            }
            let user_service = await db.user_service.findOne({ where: where });
            if (user_service != null) {
                return res.status(400).send({ error: 'ALREADY_SKILLS_EXIST' });
            }
            try {
                let resp = await db.user_service.upsert(data);
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
            addActivityLog({ user_id: req.user.id, type: 'user skills updated' });
        } else {
            res.sendStatus(406)
        }
    },
    // update speciality type, disable signed contract
    async updateUserSpecialityType(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            try {
                var user = await db.user.findByPk(data.user_id);
                if (user.speciality_type != data.speciality_type) {

                    let detail = [{
                        type: 'speciality_type',
                        old: user.speciality_type,
                        new: data.speciality_type,
                        remarks: `${req.user.first_name} updated your speciality type`
                    }];

                    let user_profile_log = await db.user_profile_log.create({
                        user_id: data.user_id,
                        detail: detail
                    });
                    // disable signed contract, so, use need resign contract
                    await db.signedContract.update({
                        status: 0,
                        end: new Date(),
                        user_profile_update_id: user_profile_log.id
                    }, { where: { user_id: data.user_id, status: 1 } });
                }

                let resp = await user.update({ speciality_type: data.speciality_type });
                addActivityLog({ user_id: data.user_id, type: 'user speciality type updated' });
                res.send({
                    status: true,
                    data: resp
                })
            } catch (error) {
                console.log(error)
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
        if (req.user && req.user.id && req.body.id) {
            try {
                let resp = await db.user_service.destroy({ where: { id: req.body.id } });
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
        if (req.user && req.user.id) {

            var user_id = req.query.user_id
            let where = { user_id: user_id };

            let attributes = ['id', 'details', 'title', 'status', 'role_id'];
            if (req.lang && req.lang == 'es') {
                attributes = ['id', ['details_es', 'details'], ['title_es', 'title'], 'status', 'role_id'];
            }

            db.user_service.findAll({
                where: where,
                include: [
                    {
                        model: db.department,
                        as: 'department',
                        attributes: attributes
                    },
                    {
                        model: db.speciality,
                        as: 'speciality',
                        attributes: attributes
                    }
                ]
            }).then(async resp => {
                resp = JSON.parse(JSON.stringify(resp));
                if (resp) await calculateServicePrice(resp, user_id);
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
        if (req.user && req.user.id && req.body.id) {
            db.user_service.findByPk(req.body.id).then(resp => {
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