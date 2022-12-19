const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { capitalize } = require('../../commons/helper');
const { response, errorResponse } = require('../../commons/response');
const { getLimitOffset } = require('../../commons/paginator')

/*====Prescription API============*/

function coupons(req, res, next) {
    if (req.user && req.user.id) {
        let search = "";
        let page = 1;
        let pageSize = 25;
        let orderKey = "id";
        let order = "asc";

        let isCouponForAdmin = false;
        if (req.body) {
            let data = req.body;
            search = data.search || "";
            orderKey = data.orderKey || "id";
            order = data.order || "asc";
            page = data.page || 1;
            pageSize = data.pageSize || 25;
            isCouponForAdmin = data.isCouponForAdmin;
        }
        let where = {}
        var include = ['user', {
            model: db.admin, as: 'admin',
            where: { id: req.user.id }, required: false
        }, 'patient', 'booking'];
        if (isCouponForAdmin) {
            where[`admin_id`] = { [Op.gte]: 1 };
            var include = ['user', 'admin', 'patient', 'booking'];
        } else {
            where[`admin_id`] = { [Op.eq]: null };
        }
        if (search && search.length) {
            where = {
                ...where,
                [Op.or]: [
                    { '$user.first_name$': { [Op.like]: `%${search}%` } },
                    { '$user.middle_name$': { [Op.like]: `%${search}%` } },
                    { '$user.last_name$': { [Op.like]: `%${search}%` } },
                    { '$user.email$': { [Op.like]: `%${search}%` } },
                    { '$user.company_name$': { [Op.like]: `%${search}%` } },

                    { '$patient.first_name$': { [Op.like]: `%${search}%` } },
                    { '$patient.middle_name$': { [Op.like]: `%${search}%` } },
                    { '$patient.last_name$': { [Op.like]: `%${search}%` } },
                    { '$patient.email$': { [Op.like]: `%${search}%` } },
                    { '$user.company_name$': { [Op.like]: `%${search}%` } },

                    { 'create_code': { [Op.like]: `%${search}%` } },

                ]
            }
        }

        db.coupon_utilisation.findAndCountAll({
            where: where,
            include: include,
            order: [[orderKey, order]],
            distinct: true,
            limit: getLimitOffset(page, pageSize)
        }).then(resp => {
            return response(res, resp)
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
}


function coupon(req, res, next) {
    if (req.user && req.user.id) {
        console.log(req.params)
        db.coupon_utilisation.findOne({ where: { id: req.params.id }, include: ['patient', { model: db.coupon_history, required: false, as: 'coupon_history', include: ['user', 'booking'] }] }).then(resp => {
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
}

async function add(req, res, next) {
    let data = req.body;

    if (req.user && req.user.id) {

        try {
            let resp;

            if (data.id == null) {
                data['admin_id'] = req.user.id;
                resp = await db.coupon_utilisation.create(data);
            }
            else resp = await db.coupon_utilisation.upsert(data);

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
}


function validate_coupon(req, res, next) {
    if (req.user && req.user.id) {
        var data = req.body;
        var now = new Date();
        var where = {
            [Op.or]:
                [{
                    patient_id: req.user.id,
                    is_global: false
                },
                {
                    is_global: true
                }],
            status: true,
            create_code: data.promotion_code,
            type: data.coupon_type,
            // [Op.lte]: { used_count: field.max_count }

        };// start: { [Op.gte]: now }, end: { [Op.lte]: now } 
        db.coupon_utilisation.findOne({ where: where }).then(async resp => {
            console.log('resp', JSON.parse(JSON.stringify(resp)))
            if (resp) {
                if (resp.used_count >= resp.max_count) {
                    res.status(404).send({
                        status: false,
                        errors: 'Max Limit',
                        data: resp
                    })
                    return;
                }
                await db.coupon_utilisation.update({ used_count: resp.used_count + 1, booking_id: data.booking_id }, { where: { create_code: data.promotion_code } });
                await db.coupon_history.create({ user_id: req.user.id, coupon_id: resp.id, booking_id: data.booking_id });
            }
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
}


async function deleteCoupon(req, res, next) {
    let data = req.body;

    if (req.user && req.user.id) {
        data['user_id'] = req.user.id;
        try {
            let resp = await db.coupon_utilisation.destroy({ where: { id: data.id } });
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
}

async function bulkUpdate(req, res, next) {
    if (req.user && req.user.id) {
        let data = req.body;
        try {
            data.forEach(async coupon_utilisation => {
                await db.coupon_utilisation.update({ status: coupon_utilisation.status }, { where: { id: coupon_utilisation.id } });
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
}

async function downloadCSV(req, res) {
    var query = req.query;
    var where = {}
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
    db.coupon_utilisation.findAll({
        where: where, include: ['user', 'patient']
    }).then(resp => {
        var user_list = JSON.parse(JSON.stringify(resp));
        res.setHeader('Content-disposition', 'attachment; filename=coupon.csv');
        res.setHeader('Content-type', 'text/csv');
        res.charset = 'UTF-8';

        var csv = 'company,code,price,customer,expired\n';
        if (attributes && attributes.length > 0) {
            csv = attributes.map(item => capitalize(item)).join(',') + '\n';
        }
        for (var i = 0; i < user_list.length; i++) {
            var coupon = user_list[i];
            var patient = coupon.patient;
            coupon.company = '';
            if (coupon.user) coupon.company = coupon.user.company_name;
            if (coupon.patient) coupon.customer = coupon.patient.fullName;

            if (attributes && attributes.length > 0) {
                csv += attributes.map(includeColumn => coupon[includeColumn] || '').join(',') + '\n';
            } else {
                csv += `${coupon.company},${coupon.create_code},${coupon.price},${patient.fullName},${coupon.end}\n`
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
}

module.exports = { coupons, coupon, add, validate_coupon, deleteCoupon, bulkUpdate, downloadCSV }
