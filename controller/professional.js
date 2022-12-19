const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { upload } = require('../commons/fileupload');
const { addActivityLog } = require('./activityLog');

module.exports = {
    async addEducation(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = req.user.id;
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
            addActivityLog({ user_id: req.user.id, type: 'education added' });
        } else {
            res.sendStatus(406)
        }

    },
    async addUserEducation(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = data.user_id;
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
            addActivityLog({ user_id: req.user.id, type: 'education added' });
        } else {
            res.sendStatus(406)
        }

    },

    async educations(req, res, next) {
        if (req.user && req.user.id) {
            let where = { user_id: req.user.id }
            if (req.query && req.query.user_id) {
                where = { user_id: req.query.user_id }
            }
            db.user_education.findAll({ where: where }).then(resp => {
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
        if (req.user && req.user.id && req.body.id) {
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
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = req.user.id;
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
            addActivityLog({ user_id: req.user.id, type: 'user practice added' });
        } else {
            res.sendStatus(406)
        }

    },
    async addUserPractice(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = data.user_id;
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
            addActivityLog({ user_id: req.user.id, type: 'user practice added' });
        } else {
            res.sendStatus(406)
        }

    },
    async practices(req, res, next) {
        if (req.user && req.user.id) {
            let where = { user_id: req.user.id }
            if (req.query && req.query.user_id) {
                where = { user_id: req.query.user_id }
            }
            db.user_practice.findAll({ where: where }).then(resp => {
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
        if (req.user && req.user.id && req.body.id) {
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
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = req.user.id;
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
            addActivityLog({ user_id: req.user.id, type: 'user licence added' });
        } else {
            res.sendStatus(406)
        }

    },
    async addUserLicense(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = data.user_id;
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
            addActivityLog({ user_id: req.user.id, type: 'user licence added' });
        } else {
            res.sendStatus(406)
        }

    },
    async licenses(req, res, next) {
        if (req.user && req.user.id) {
            let where = { user_id: req.user.id }
            if (req.query && req.query.user_id) {
                where = { user_id: req.query.user_id }
            }
            db.user_license.findAll({ where: where }).then(resp => {
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
        if (req.user && req.user.id && req.body.id) {
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
                            await db.user_education.update({ document: resp.path }, { where: { user_id: req.user.id, id: resp.fields.id } });
                            break;
                        case 'practice':
                            await db.user_practice.update({ document: resp.path }, { where: { user_id: req.user.id, id: resp.fields.id } });
                            break;
                        case 'license':
                            await db.user_license.update({ document: resp.path }, { where: { user_id: req.user.id, id: resp.fields.id } });
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
            if (req.body.model) {
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

        } else {
            res.sendStatus(406)
        }
    }
}