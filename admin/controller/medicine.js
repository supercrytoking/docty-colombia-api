const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const { capitalize } = require('../../commons/helper');


module.exports = {
    getMedicines: async (req, res, next) => {
        if (req.user && req.user.id) {
            let search = "";
            let page = 1;
            let orderKey = "product";
            let order = "asc";
            let isDoctorMedicine = false;
            if (req.body) {
                let data = req.body;
                search = data.search || "";
                orderKey = data.orderKey || "product";
                order = data.order || "asc";
                page = data.page || 1;
                if (data.isDoctorMedicine != null) isDoctorMedicine = data.isDoctorMedicine;
            }
            var where = {
                product: { [Op.like]: `%${search}%` }
            };
            if (isDoctorMedicine) {
                where['$medicine_custom.id$'] = { [Op.eq]: null };//created by doctor
                where['status'] = false;//no published medicine
            } else {
                where = {
                    ...where,
                    [Op.or]: [
                        { '$medicine_custom.id$': { [Op.eq]: null } },//created by admin
                        {
                            [Op.and]: [
                                { '$medicine_custom.id$': { [Op.ne]: null } },//created by doctor
                                { status: true },//published medicine
                            ]
                        }
                    ],
                }
            }
            db.medicine.findAndCountAll({
                where: where,
                order: [[orderKey, order]],
                limit: getLimitOffset(page),
                include: [{
                    model: db.medicine_custom,
                    as: 'medicine_custom',
                    required: false,
                    include: ['user']
                }]
            }).then(resp => {
                return response(res, resp)
            }).catch(err => {
                return errorResponse(res, err)
            })
        } else {
            res.sendStatus(406)
        }
    },
    addMedicines: async (req, res, next) => {
        let data = req.body;
        if (req.user && req.user.id) {
            try {
                let resp = await db.medicine.upsert(data);
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
    async bulkUpdateMedicines(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                data.forEach(async medicine => {
                    await db.medicine.update({ status: medicine.status }, { where: { id: medicine.id } });
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
    getMedicineDoseTypes: async (req, res, next) => {
        if (req.user && req.user.id) {
            db.medicine_dose_type.findAll().then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    errors: `${err}`,
                    success: false
                })
            })
        } else {
            res.sendStatus(406)
        }
    }, addMedicineDoseType: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                let resp = await db.medicine_dose_type.upsert(data);
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

        db.medicine.findAll({
            where: where,
            include: [{
                model: db.medicine_custom,
                as: 'medicine_custom',
                required: false,
                include: ['user']
            }]
        }).then(resp => {

            var medicine_list = JSON.parse(JSON.stringify(resp));
            res.setHeader('Content-disposition', 'attachment; filename=medicine_list.csv');
            res.setHeader('Content-type', 'text/csv');
            res.charset = 'UTF-8';
            var csv = 'proceedings,product,holderCompany,healthRegister,expeditionDate,expirationDate,registrationStatus,quantityCum,commercialDescription,cumState,created_at\n';
            if (attributes && attributes.length > 0) {
                csv = attributes.map(item => capitalize(item)).join(',') + '\n';
            }

            for (var i = 0; i < medicine_list.length; i++) {
                var m = medicine_list[i];
                m['doctor'] = '';
                if (m.medicine_custom && m.medicine_custom.user)
                    m['doctor'] = m.medicine_custom.user.fullName;

                if (attributes && attributes.length > 0) {
                    csv += attributes.map(includeColumn => m[includeColumn] || '').join(',') + '\n';
                } else {
                    csv += `${m.proceedings},${m.product},${m.holderCompany},${m.healthRegister},${m.expeditionDate},${m.expirationDate},${m.registrationStatus},${m.quantityCum},${m.commercialDescription},${m.cumState},${m.healthRegister},${m.status},${m.createdAt}\n`
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

    async deleteMedicine(req, res, next) {
        try {
            db.medicine.destroy({ where: { id: req.body.id } }).then(resp => {
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