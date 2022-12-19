const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { capitalize } = require('../../commons/helper');
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const { createInvoicePDF } = require('../../commons/pdfUtil');

module.exports = {
    async addInvoice(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {

            // res.send(data)
            try {
                db.invoice.upsert(data).then(resp => {
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
        } else {
            res.sendStatus(406)
        }
    },
    async invoices(req, res, next) {
        if (req.user && req.user.id) {
            let attr = ['title', 'id'];
            if (req.lang == 'es') {
                attr = [['title_es', 'title'], 'id']
            }
            let page = 1;
            let pageSize = 25;
            let orderKey = "createdAt";
            let order = "asc";
            let search = "";
            if (req.body) {
                let data = req.body;
                search = data.search || "";
                orderKey = data.orderKey || "createdAt";
                order = data.order || "asc";
                page = data.page || 1;
                pageSize = req.body.pageSize || 25;
            }
            if (req.query && req.query.page) {
                page = req.query.page;
            }

            let where = {};

            if (search && search.length > 0) {
                where = {
                    [Op.or]: [
                        { '$from.first_name$': { [Op.like]: `%${search}%` } },
                        { '$from.middle_name$': { [Op.like]: `%${search}%` } },
                        { '$from.last_name$': { [Op.like]: `%${search}%` } },
                        { '$from.email$': { [Op.like]: `%${search}%` } },
                        
                        { '$to.first_name$': { [Op.like]: `%${search}%` } },
                        { '$to.middle_name$': { [Op.like]: `%${search}%` } },
                        { '$to.last_name$': { [Op.like]: `%${search}%` } },
                        { '$to.email$': { [Op.like]: `%${search}%` } },
                        { '$booking.id$': { [Op.like]: `%${search}%` } },
                    ]
                }
            }
            let include = [
                {
                    model: db.booking,
                    as: 'booking',
                    attributes: ['id', 'councelling_type'],
                    include: [
                        {
                            model: db.speciality,
                            as: 'speciality',
                            attributes: attr,
                            include: [
                                {
                                    model: db.department,
                                    as: 'department',
                                    attributes: attr,
                                }
                            ]
                        }
                    ]
                },
                {
                    model: db.user,
                    as: 'to',
                    attributes: ['first_name', 'middle_name', 'last_name', 'fullName', 'id_proof_type', 'national_id'],
                    seperate: true,
                    include: [{
                        model: db.address,
                        required: false,
                        where: { family_id: 0 },
                        as: 'address'
                    }]
                },
                {
                    model: db.user.scope('publicInfo'),
                    as: 'from',
                    attributes: ['first_name', 'middle_name', 'last_name', 'fullName', 'id_proof_type', 'national_id'],
                    seperate: true,
                    include: ['associatedTo', {
                        model: db.address,
                        required: false,
                        where: { family_id: 0 },
                        as: 'address'
                    }]
                }
            ];

            if (req.query && req.query.from_id) {
                where.from_id = req.query.from_id
            }

            db.invoice.findAndCountAll({
                where: where,
                include: include,
                // group: 'id',
                distinct: true,
                order: [[orderKey, order]],
                limit: getLimitOffset(page, pageSize)
            }).then(resp => response(res, resp)).catch(err => { console.log(err); errorResponse(res, err) })

        }
        else {
            res.sendStatus(406)
        }
    },
    async invoiceBybooking(req, res, next) {
        if (req.user && req.user.id) {
            db.invoice.findOne({
                where: { booking_id: req.body.booking_id }, include: [{
                    model: db.user,
                    as: 'from',
                    attributes: ['first_name', 'middle_name', 'last_name', 'fullName'],
                    include: ['address', 'associatedTo']
                },
                {
                    model: db.user,
                    as: 'to',
                    include: ['address']
                }]
            }).then(resp => {
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
    async invoice(req, res, next) {
        if (req.user && req.user.id && req.body.id) {
            db.invoice.findByPk(req.body.id).then(resp => {
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
    async remove(req, res, next) {
        if (req.user && req.user.id) {
            try {
                await db.invoice.destroy({ where: { id: req.body.id } });
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

        db.invoice.findAll({ where: where, include: ['from', 'to'], order: [['createdAt', 'asc']] }).then(resp => {
            var book_list = JSON.parse(JSON.stringify(resp));
            res.setHeader('Content-disposition', 'attachment; filename=invoice_list_csv.csv');
            res.setHeader('Content-type', 'text/csv');
            res.charset = 'UTF-8';

            var csv = 'Invice ID,From,To,Booking ID,Payment Mode, Amount, Status, Discount\n';
            if (attributes && attributes.length > 0) {
                csv = attributes.map(item => capitalize(item)).join(',') + '\n';
            }
            for (var i = 0; i < book_list.length; i++) {
                var invoice = book_list[i];
                if (invoice.from == null) continue;
                if (invoice.to == null) continue;
                invoice.from_user = invoice.from.fullName;
                invoice.to_user = invoice.to.fullName;
                console.log(invoice)
                if (attributes && attributes.length > 0) {
                    csv += attributes.map(includeColumn => invoice[includeColumn] || '').join(',') + '\n';
                } else {
                    csv += `${invoice.invoice_id},${invoice.from.first_name},${invoice.to.first_name},${invoice.booking_id},${invoice.payment_mod},${invoice.amount},${invoice.status},${invoice.discount}\n`
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
    
    async downloadPDF(req, res, next) {
        if (req.user && req.user.id && req.query && req.query.id) {
            try {
                let lang = req.lang || 'en'
                let attr = ['title', 'id'];
                if (lang == 'es') {
                    attr = [['title_es', 'title'], 'id']
                }

                var id = req.query.id;
                var invoice = await db.invoice.findOne({
                    where: { id: id },
                    include: [{
                        model: db.booking,
                        as: 'booking',
                        attributes: ['id', 'councelling_type', 'reference_id'],
                        include: [
                            {
                                model: db.speciality,
                                as: 'speciality',
                                attributes: attr,
                                include: [
                                    {
                                        model: db.department,
                                        as: 'department',
                                        attributes: attr,
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: db.user,
                        as: 'from',
                        include: ['address']
                    }, {
                        model: db.user,
                        as: 'to',
                        include: ['address']
                    }]
                });

                var r = await createInvoicePDF(invoice, req, true);
                // res.redirect(r.Location);
                r.pipe(res);
                // res.send(r);
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
}