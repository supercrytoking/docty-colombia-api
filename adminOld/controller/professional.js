const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { upload } = require('../../commons/fileupload');


module.exports = {
    async addEducation(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            data['user_id'] = req.body.user_id;
            try {
                let resp = await db.user_education.upsert(data);
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
    async updateEducation(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            console.log(data);
            try {
                let resp = await db.user_education.update(data, { where: { id: data.id } });
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

    async educations(req, res, next) {
        if (req.user && req.user.id) {
            db.user_education.findAll({ where: { user_id: req.body.user_id } }).then(resp => {
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
    async education(req, res, next) {
        if (req.user && req.user.id) {
            db.user_education.findByPk(req.body.id).then(resp => {
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

    /** Practice */

    async addPractice(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            data['user_id'] = req.body.user_id;
            try {
                let resp = await db.user_practice.upsert(data);
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
    async practices(req, res, next) {
        if (req.user && req.user.id) {
            db.user_practice.findAll({ where: { user_id: req.body.user_id } }).then(resp => {
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
    async practice(req, res, next) {
        if (req.user && req.user.id) {
            db.user_practice.findByPk(req.body.id).then(resp => {
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
    /** Licenses */

    async addLicense(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            data['user_id'] = req.body.user_id;
            try {
                let resp = await db.user_license.upsert(data);
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
    async licenses(req, res, next) {
        if (req.user && req.user.id) {
            db.user_license.findAll({ where: { user_id: req.body.user_id } }).then(resp => {
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
    async license(req, res, next) {
        if (req.user && req.user.id) {
            db.user_license.findByPk(req.body.id).then(resp => {
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
    uploadDoc(req, res, next) {
        if (req.user && req.user.id) {
            upload(req, 'documents', 'file').then(async resp => {
                if (resp && resp.path) {
                    switch (resp.fields.type) {
                        case 'education':
                            await db.user_education.update({ document: resp.path }, { where: { user_id: req.body.user_id, id: resp.fields.id } });
                            break;
                        case 'practice':
                            await db.user_practice.update({ document: resp.path }, { where: { user_id: req.body.user_id, id: resp.fields.id } });
                            break;
                        case 'license':
                            await db.user_license.update({ document: resp.path }, { where: { user_id: req.body.user_id, id: resp.fields.id } });
                            break;
                        default:
                    }
                    res.send(resp)
                } else {
                    res.sendStatus(500)
                }
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                })
            })
        } else {
            res.sendStatus(406)
        }
    },
    async remove(req, res, next) {
        if (req.user && req.user.id) {
            switch (req.body.model) {
                case 'education':
                    await db.user_education.destroy({ where: { id: req.body.id } });
                    break;
                case 'practice':
                    await db.user_practice.destroy({ where: { id: req.body.id } });
                    break;
                case 'license':
                    await db.user_license.destroy({ where: { id: req.body.id } })
                    break;
                default:
            }
            res.send({
                success: true,
                message: 'Deleted Successfully'
            })
        } else {
            res.sendStatus(500)
        }
    }
}