const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

module.exports = {
    async getPages(req, res, next) {
        let where = {};
        if (req.params && req.params.page_code) {
            where.code = req.params.page_code
        }
        db.static_page_detail.findAll({ where, paranoid: false }).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.send({
                errors: `${err}`
            })
        })

    },
    async getPage(req, res, next) {
        db.static_page_detail.findByPk(req.params.id, { paranoid: false }).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.send({
                errors: `${err}`
            })
        })
    },
    async savePage(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            if (!!!data['code']) {
                data['code'] = data.name;
            }
            if (data.id) {
                let page = await db.static_page_detail.findByPk(data.id);
                if (!!page.isPublished) {
                    return res.status(400).send({
                        status: false,
                        message: 'Cant cahnge published page'
                    });
                } else {
                    page.update(data).then(resp => {
                        res.send({
                            status: true,
                            data: page,
                            message: 'success'
                        });
                    }).catch(err => {
                        res.status(400).send({
                            status: false,
                            errors: err
                        })
                    })
                }
            } else {
                db.static_page_detail.create(data).then(resp => {
                    res.send({
                        status: true,
                        data: resp,
                        message: 'success'
                    });
                }).catch(err => {
                    res.status(400).send({
                        status: false,
                        errors: err
                    })
                })
            }

        }
        else {
            res.sendStatus(406)
        }
    },
    getPageTypes(req, res) {
        db.static_page_type.findAll().then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            })
        })
    },
    deletePageTypes(req, res) {
        db.static_page_type.destroy({ where: { id: req.params.id } }).then(resp => {
            module.exports.getPageTypes(req, res)
        }).catch(err => {
            res.status(400).send({
                status: false, error: `${err}`
            })
        })
    },
    savePageTypes(req, res) {
        if (req.user && req.user.id) {
            let data = req.body;
            db.static_page_type.upsert(data).then(resp => {
                module.exports.getPageTypes(req, res)
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
    async publish(req, res) {
        try {
            let id = req.params.id;
            let page = await db.static_page_detail.findByPk(id);
            await page.update({ isPublished: true });
            await db.static_page_detail.destroy({
                where:
                {
                    code: page.code,
                    isPublished: 1,
                    id: { [Op.ne]: id },
                    language: page.language
                },
            })//.then(res => {
            await db.static_page_type.update({ version: page.version, deletedAt: null }, { where: { page_code: page.code }, paranoid: false });
            // })
            res.send({
                status: true,
                message: 'success'
            });
        } catch (error) {
            res.status(400).send({
                status: false,
                message: `${error}`
            });
        }
    },
    deletePage(req, res) {
        db.static_page_detail.destroy({ where: { id: req.params.id }, paranoid: false }).then(resp => {
            res.send({
                status: true,
                message: 'success'
            });
        }).catch(error => {
            res.status(400).send({
                status: false,
                message: `${error}`
            });
        });
    }

}