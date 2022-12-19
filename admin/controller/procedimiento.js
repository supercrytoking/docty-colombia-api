const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const { capitalize } = require('../../commons/helper');

module.exports = {
    getProcedimiento: async (req, res, next) => {
        let search = "";
        let page = 1;
        let orderKey = "section";
        let order = "asc";
        if (req.body) {
            let data = req.body;
            search = data.search || "";
            orderKey = data.orderKey || "section";
            order = data.order || "asc";
            page = data.page || 1;
        }
        var where = {
            [Op.or]: [
                { section: { [Op.like]: `%${search}%` } },
                { process: { [Op.like]: `%${search}%` } },
                { group: { [Op.like]: `%${search}%` } },
                { subgroup: { [Op.like]: `%${search}%` } },
                { chapter: { [Op.like]: `%${search}%` } },
            ]
        }
        if (req.user && req.user.id) {
            let search = "";
            let page = 1;
            let orderKey = "section";
            let order = "asc";
            if (req.body) {
                let data = req.body;
                search = data.search || "";
                orderKey = data.orderKey || "section";
                order = data.order || "asc";
                page = data.page || 1;
            }
            where = {
                section: { [Op.like]: `%${search}%` }
            }
            if (req.body.speciality_type) where.speciality_type = req.body.speciality_type;

            db.procedure.findAndCountAll({
                where: where,
                order: [[orderKey, order]],
                limit: getLimitOffset(page)
            }).then(resp => {
                return response(res, resp)
            }).catch(err => {
                console.log(err)
                return errorResponse(res, err)
            })
        } else {
            res.sendStatus(406)
        }
    },
    addProcedimiento: async (req, res, next) => {
        let data = req.body;
        if (req.user && req.user.id) {
            try {
                let resp = await db.procedure.upsert(data);
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
    async bulkUpdateProcedimientos(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                data.forEach(async procedimiento => {
                    await db.procedure.update({ status: procedimiento.status }, { where: { id: procedimiento.id } });
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

        db.procedure.findAll({ where: where }).then(resp => {

            var medicine_list = JSON.parse(JSON.stringify(resp));
            res.setHeader('Content-disposition', 'attachment; filename=procedure_list.csv');
            res.setHeader('Content-type', 'text/csv');
            res.charset = 'UTF-8';
            var csv = 'section,chapter,group,subgroup,category,process,status,created_at\n';
            if (attributes && attributes.length > 0) {
                csv = attributes.map(item => capitalize(item)).join(',') + '\n';
            }
            for (var i = 0; i < medicine_list.length; i++) {
                var m = medicine_list[i];

                if (attributes && attributes.length > 0) {
                    csv += attributes.map(includeColumn => m[includeColumn] || '').join(',') + '\n';
                } else {
                    csv += `${m.section},${m.chapter},${m.group},${m.subgroup},${m.category},${m.process},${m.status}\n`
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

    async deleteProcedure(req, res, next) {
        try {
            db.procedure.destroy({ where: { id: req.body.id } }).then(resp => {
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