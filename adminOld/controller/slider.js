const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

module.exports = {
    async add(req, res, next) {

        let data = req.body;
        try {
            db.slider.upsert(data).then(resp => {
                res.send({
                    status: true,
                    data: resp
                })
            }).catch(err => {
                res.send(err)
            })

        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            })
        }
    },
    async sliders(req, res, next) {
        if (req.user && req.user.id) {
            let where = {};
            if (req.params.id) where.id = req.params.id;
            db.slider.findAll({ where: where })
                .then(resp => {
                    res.send(resp);
                }).catch(err => {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    })
                })
        }
        else {
            res.sendStatus(406)
        }
    },
    async remove(req, res, next) {
        if (req.user && req.user.id) {
            try {
                await db.slider.destroy({ where: { id: req.body.id } });
                res.send({
                    success: true,
                    message: 'Deleted Successfully'
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
    async toggleStatus(req, res, next) {
        if (req.user && req.user.id) {
            try {
                await db.slider.update({ status: req.body.status }, { where: { id: req.body.id } });
                res.send({
                    success: true,
                    message: 'Updated'
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
    async toggleGroupStatus(req, res, next) {
        if (req.user && req.user.id) {
            let roles = [];
            if (req.body.roles) {
                roles = req.body.roles || [];
            }
            try {
                await db.slider.update({ status: false }, { where: { user_role: { [Op.notIn]: roles } } });
                for (let role of roles) {
                    let data = await db.slider.findOne({ where: { user_role: role, status: true } });
                    if (!!!data) {
                        await db.slider.update({ status: true }, { where: { user_role: role } });
                    }
                }

                let slider = await db.slider.findAll()
                res.send({
                    success: true,
                    message: 'Updated',
                    data: slider
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
    }
}