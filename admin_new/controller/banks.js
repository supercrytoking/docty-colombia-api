const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const { capitalize } = require('../../commons/helper');

module.exports = {
    async banks(req, res, next) {
        try {
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
            console.log(where)
            try {
                db.bank.findAndCountAll({
                    where: where,
                    order: [[orderKey, order]],
                    limit: getLimitOffset(page)
                }).then(providers => response(res, providers))
                    .catch(err => { errorResponse(res, err); console.log(err) });
            } catch (error) {
                res.status(500).send({
                    error_code: 105,
                    status: false,
                    error: error
                });
            }
        } catch (e) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: e
            });
        }
    },
    async downloadCSV(req, res, next) {
        var query = req.query;
        var where = {};

        if (query.from) {
            where['createdAt'] = { [Op.gte]: (new Date(query.from)) };
        }
        if (query.to) {
            where['createdAt'] = { [Op.lte]: (new Date(query.to)) };
        }

        if (query.from && query.to) {
            where['createdAt'] = { [Op.and]: [{ [Op.gte]: (new Date(query.from)) }, { [Op.lte]: (new Date(query.to)) }] };
        }

        var attributes = [];
        if (query.includes) {
            attributes = query.includes.split(',');
        }

        db.bank.findAll({ where: where, include: ['country'] }).then(resp => {
            var bank_list = JSON.parse(JSON.stringify(resp));
            res.setHeader('Content-disposition', 'attachment; filename=bank_list.csv');
            res.setHeader('Content-type', 'text/csv');
            res.charset = 'UTF-8';

            var csv = 'Name,Country,Description,\n';
            if (attributes && attributes.length > 0) {
                csv = attributes.map(item => capitalize(item)).join(',') + '\n';
            }
            for (var i = 0; i < bank_list.length; i++) {
                var bank = bank_list[i];
                if (bank.country) {
                    bank.country = bank.country.name;
                }
                else bank.country = {};

                if (attributes && attributes.length > 0) {
                    csv += attributes.map(includeColumn => bank[includeColumn] || '').join(',') + '\n';
                } else {
                    csv += `${bank.name},${bank.country.name},${bank.description}\n`;
                }
            }

            res.write(csv);
            res.end();
        }).catch(err => {
            console.log(err);
            res.status(400).send({
                status: false,
                errors: `${err}`
            });
        });
    },
    async add(req, res, next) {
        try {
            db.bank.upsert(req.body).then(resp => {
                res.send({
                    status: true,
                    message: 'success',
                    data: resp
                });
            }).catch(err => {
                res.status(500).send({
                    status: false,
                    errors: `${err}`
                });
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: error
            });
        }
    },
    async bulkUpdate(req, res, next) {
        try {
            var data = req.body;
            data.forEach(async bank => {
                await db.bank.update({ status: bank.status }, { where: { id: bank.id } });
            });
            res.send({
                status: true,
                data: true
            });
        } catch (error) {
            res.status(500).send({
                status: false,
                errors: error
            });
        }
    },
    async deleteBank(req, res, next) {
        try {
            db.bank.destroy({ where: { id: req.body.id } }).then(resp => {
                res.send({
                    status: true,
                    message: 'success',
                    data: resp
                });
            }).catch(err => {
                res.status(500).send({
                    status: false,
                    errors: `${err}`
                });
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            });
        }
    }
};
