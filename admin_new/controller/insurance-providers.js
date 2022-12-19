const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const { capitalize } = require('../../commons/helper');

module.exports = {
    async InsuranceProviders(req, res, next) {
        let page = 1;
        let orderKey = 'name';
        let order = 'ASC';
        let search = '';
        if (req.query && req.query.page) {
            page = req.query.page;
        }
        if (req.body && req.body.page) {
            page = req.body.page;
        }
        if (req.body && req.body.search) {
            search = req.body.search;
        }
        if (req.body && req.body.orderKey) {
            orderKey = req.body.orderKey;
        }
        if (req.body && req.body.order) {
            order = req.body.order;
        }
        let where = {};
        if (req.body && req.body.id) {
            where.id = req.body.id;
        }
        if (search.length > 0) {
            where.name = { [Op.like]: `%${search}%` };
        }
        try {
            db.insurence_provider.findAndCountAll({
                where: where,
                order: [[orderKey, order]],
                limit: getLimitOffset(page)
            }).then(providers => response(res, providers))
                .catch(err => errorResponse(res, err))
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: error
            })
        }
    },
    async downloadCSV(req, res, next) {
        var query = req.query;
        var where = {};

        if (query.from) {
            where['createdAt'] = { [Op.gte]: (new Date(query.from)) }
        }
        if (query.to) {
            where['createdAt'] = { [Op.lte]: (new Date(query.to)) }
        }

        if (query.from && query.to) {
            where['createdAt'] = { [Op.and]: [{ [Op.gte]: (new Date(query.from)) }, { [Op.lte]: (new Date(query.to)) }] }
        }

        var attributes = [];
        if (query.includes) {
            attributes = query.includes.split(',');
        }

        db.insurence_provider.findAll({ where: where, include: ['insurence_service_country'] }).then(resp => {
            var insurence_provider_list = JSON.parse(JSON.stringify(resp));
            res.setHeader('Content-disposition', 'attachment; filename=insurence_provider_list.csv');
            res.setHeader('Content-type', 'text/csv');
            res.charset = 'UTF-8';

            var csv = 'Name,Country,Description,\n';
            if (attributes && attributes.length > 0) {
                csv = attributes.map(item => capitalize(item)).join(',') + '\n';
            }
            for (var i = 0; i < insurence_provider_list.length; i++) {
                var insurence_provider = insurence_provider_list[i];
                if (insurence_provider.insurence_service_country) {
                    insurence_provider.country = insurence_provider.insurence_service_country.name;
                }
                else insurence_provider.insurence_service_country = {}

                if (attributes && attributes.length > 0) {
                    csv += attributes.map(includeColumn => insurence_provider[includeColumn] || '').join(',') + '\n';
                } else {
                    csv += `${insurence_provider.name},${insurence_provider.insurence_service_country.name},${insurence_provider.description}\n`
                }
            }

            res.write(csv);
            res.end();
        }).catch(err => {
            console.log(err)
            res.status(400).send({
                status: false,
                errors: `${err}`
            })
        })
    },
    async addProvider(req, res, next) {
        try {
            console.log('*')
            db.insurence_provider.upsert(req.body).then(resp => {
                res.send({
                    status: true,
                    message: 'success'
                })
            }).catch(err => {
                res.status(500).send({
                    status: false,
                    errors: `${err}`
                })
            })
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: error
            })
        }
    },
    async bulkUpdate(req, res, next) {
        try {
            var data = req.body;
            data.forEach(async insurence_provider => {
                await db.insurence_provider.update({ status: insurence_provider.status }, { where: { id: insurence_provider.id } });
            });
            res.send({
                status: true,
                data: true
            })
        } catch (error) {
            res.status(500).send({
                status: false,
                errors: error
            })
        }
    },
    async deleteProvider(req, res, next) {
        try {
            db.insurence_provider.destroy({ where: { id: req.body.id } }).then(resp => {
                res.send({
                    status: true,
                    message: 'success'
                })
            }).catch(err => {
                res.status(500).send({
                    status: false,
                    errors: `${err}`
                })
            })
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    },
    async InsuranceBenifits(req, res, next) {
        try {
            let benifits = await db.insurence_benifit.paginate();
            res.send(benifits)
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: error
            })
        }
    },
}