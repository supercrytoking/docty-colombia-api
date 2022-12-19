const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { upload } = require('../commons/fileupload');
const { createInvoicePDF } = require('../commons/pdfUtil');
module.exports = {
    async addInvoice(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {

            res.send(data)
            // try {
            //     db.invoice.upsert(data).then(resp => {
            //         res.send({
            //             status: true,
            //             data: resp
            //         })
            //     }).catch(err => {
            //         res.send(err)
            //     })

            // } catch (error) {
            //     res.status(400).send({
            //         status: false,
            //         errors: error
            //     })
            // }
        } else {
            res.sendStatus(406)
        }
    },
    async invoices(req, res, next) {
        if (req.user && req.user.id) {
            var myStaff = await db.associate.findAll({
                where: { user_id: req.user.id }
            });
            var staffIdList = [];
            if (myStaff) staffIdList = myStaff.map(item => item.associate);
            staffIdList.push(req.user.id);
            console.log('d', staffIdList)

            let where = { to_id: { [Op.in]: staffIdList } };
            if (req.query && req.query.from_id) {
                where.from_id = req.query.from_id
            }
            console.log(where);

            db.invoice.findAll({ where: where, include: ['from', 'to', 'booking'], order: [['createdAt', 'DESC']] }).then(resp => {
                res.send(resp)
            }).catch(err => {
                console.log(err)
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
    async invoiceBybooking(req, res, next) {
        let attr = ['title', 'id', 'title_es'];

        // let attr = ['title', 'id'];
        // if (req.lang == 'es') {
        //     attr = [['title_es', 'title'], 'id']
        // }
        if (req.user && req.user.id) {
            db.invoice.findOne({
                where: { booking_id: req.body.booking_id }, include: [
                    {
                        model: db.user.scope(),
                        as: 'from',
                        attributes: ['first_name', 'middle_name', 'last_name', 'fullName', 'id_proof_type', 'national_id'],
                        include: ['address', 'associatedTo']
                    },
                    {
                        model: db.user,
                        as: 'from2',
                        attributes: ['first_name', 'middle_name', 'last_name', 'fullName', 'id_proof_type', 'national_id'],
                        include: ['address', 'associatedTo']
                    },
                    {
                        model: db.user,
                        as: 'to',
                        attributes: ['first_name', 'middle_name', 'last_name', 'fullName', 'id_proof_type', 'national_id'],
                        include: ['address']
                    },
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
                    }
                ]
            }).then(async (resp) => {
                let respp = JSON.parse(JSON.stringify(resp))
                let inSql = `SELECT um.json_data,um.id FROM associates a,usermeta um 
    WHERE a.user_id = um.user_id AND um.key = "invoiceSettings" AND a.associate = ${respp.from_id}`
                let inSet = await db.sequelize.query(inSql).spread((r, m) => r[0]).catch(e => console.log(e));
                if (inSet) {
                    if (typeof inSet.json_data == 'string') inSet.json_data = JSON.parse(inSet.json_data);
                    respp.setting = inSet.json_data;
                }
                res.send(respp)
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                })
            })

        }
        else {
            res.sendStatus(406)
        }
    },
    async invoice(req, res, next) {
        if (req.user && req.user.id && req.body.id) {
            db.invoice.findOne({ where: { id: req.body.id }, include: ['from', 'to'] }).then(resp => {
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