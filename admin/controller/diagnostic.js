const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const { capitalize } = require('../../commons/helper');

module.exports = {
    getDiagnostic: async (req, res, next) => {
        if (req.user && req.user.id) {
            let search = "";
            let page = 1;
            let orderKey = "title";
            let order = "asc";
            if (req.body) {
                let data = req.body;
                search = data.search || "";
                orderKey = data.orderKey || "title";
                order = data.order || "asc";
                page = data.page || 1;
            }
            var where = {
                [Op.or]: [
                    { cie_3_char: { [Op.like]: `%${search}%` } },
                    { cie_4_char: { [Op.like]: `%${search}%` } },
                    { title: { [Op.like]: `%${search}%` } },
                    { discription: { [Op.like]: `%${search}%` } }
                ]
            }
            db.diagnostic.findAndCountAll({
                where: where,
                order: [[orderKey, order]],
                limit: getLimitOffset(page)
            }).then(resp => {
                return response(res, resp)
            }).catch(err => {
                console.log(err)
                return errorResponse(res, err)
            })
        }
        else {
            res.sendStatus(406)
        }
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
    async bulkUpdateDiagnostic(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                data.forEach(async diagnostic => {
                    await db.diagnostic.update({ status: diagnostic.status }, { where: { id: diagnostic.id } });
                });
                res.send({
                    status: true,
                    data: true
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

        db.diagnostic.findAll({ where: where }).then(resp => {
            var diagnostic_list = JSON.parse(JSON.stringify(resp));
            res.setHeader('Content-disposition', 'attachment; filename=diagnostic_list_csv.csv');
            res.setHeader('Content-type', 'text/csv');
            res.charset = 'UTF-8';
            var csv = 'title,cie_3_char,discription,cie_4_char status,created_at\n';
            if (attributes && attributes.length > 0) {
                csv = attributes.map(item => capitalize(item)).join(',') + '\n';
            }
            for (var i = 0; i < diagnostic_list.length; i++) {
                var diagnostic = diagnostic_list[i];

                if (attributes && attributes.length > 0) {
                    csv += attributes.map(includeColumn => diagnostic[includeColumn] || '').join(',') + '\n';
                } else {
                    csv += `${diagnostic.title},${diagnostic.cie_3_char},${diagnostic.discription},${diagnostic.cie_4_char},${diagnostic.status},${diagnostic.createdAt}\n`
                }
            }

            res.write(csv);
            res.end();
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: `${err}`
            })
        })
    },
    async deleteDiagnostic(req, res, next) {
        try {
            db.diagnostic.destroy({ where: { id: req.body.id } }).then(resp => {
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
}