const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const sectionValidator = require("../../validation/section");
const translationValidator = require("../../validation/traanslation");

module.exports = {
    getTranslations: (req, res, next) => {
        var where = {};
        if (req.query && req.query.section) {
            where['section'] = req.query.section;
        } else {
            where['section'] = { [Op.notIn]: ['MOBILE_APP', 'WELLNESS_WEB'] }
        }
        if (req.query && req.query.search) {
            where = {
                [Op.or]: [
                    { keyword: { [Op.like]: `%${req.query.search}%` } },
                    { en: { [Op.like]: `%${req.query.search}%` } },
                    { es: { [Op.like]: `%${req.query.search}%` } },
                ]
            }
        }
        db.translation.findAll({
            where,
            attributes: { exclude: ['id', 'createdAt', 'updatedAt'] },
            order: [['keyword', 'asc']]
        }).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: `${err}`
            })
        })
    },
    setTranslation: async (req, res, next) => {
        let data = req.body;
        const { errors, isValid } = translationValidator.validateAddressInput(data);
        if (!isValid) {
            return res.status(400).send({
                status: false,
                errors: errors
            })
        }
        let translation = await db.translation.findOrCreate({ where: { keyword: data.keyword, section: data.section } });
        if (translation && translation.length) {
            let trans = translation[0];
            trans.update(data).then(resp => {
                res.send({ status: true, data: resp })
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                })
            })
        } else {
            res.status(400).send({
                status: false, errors: 'nothing to save.'
            })
        }
    },
    getSections: (req, res, next) => {
        db.section.findAll({
            order: [['name', 'asc']]
        }).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: `${err}`
            })
        })
    },
    setSection: async (req, res, next) => {
        let data = req.body;
        const { errors, isValid } = sectionValidator.validateAddressInput(data);
        if (!isValid) {
            return res.status(400).send({
                status: false,
                errors: errors
            })
        }
        let section = await db.section.findOrCreate({ where: { code: data.code } });
        if (section && section.length) {
            let trans = section[0];
            trans.update(data).then(resp => {
                res.send({ status: true, data: resp })
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                })
            })
        } else {
            res.status(400).send({
                status: false, errors: 'nothing to save.'
            })
        }
    },
    translations: (req, res, next) => {
        var where = {};
        if (req.params && req.params.section) {
            where = { section: req.params.section };
        }
        let query = {};
        if (req.query) {
            query = req.query;
        }

        db.translation.findAll({
            where,
            attributes: { exclude: ['id', 'createdAt', 'updatedAt'] },
            order: [['keyword', 'asc']]
        }).then(resp => {
            let data = {
                en: {}, es: {}
            }
            resp.forEach(ele => {
                let key = ele.keyword;
                if (query.lowercase) {
                    key = key.toLowerCase();
                }
                data.en[`${key}`] = ele.en;
                data.es[`${key}`] = ele.es;
            })
            res.send(data)
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: `${err}`
            })
        })
    },
}
