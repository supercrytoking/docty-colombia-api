const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");


/*====Prescription API============*/

function coupons(req, res, next) {
    if (req.user && req.user.id) {
        db.coupon_utilisation.findAll({ where: { user_id: req.user.id }, include: ['patient'] }).then(resp => {
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
            start: { [Op.lte]: now },
            end: { [Op.gte]: now }
        };
        db.coupon_utilisation.findOne({
            where: where,
            include: [{
                model: db.location,
                foreignKey: 'location_id',
                as: 'location',
                required: false
            }]
        }).then(async resp => {
            if (resp) {
                resp = (JSON.parse(JSON.stringify(resp)));
                if (resp.used_count >= resp.max_count) {
                    res.status(404).send({
                        status: false,
                        errors: 'Max Limit',
                        data: resp
                    })
                    return;
                }
                await db.coupon_utilisation.update({
                    used_count: resp.used_count + 1,
                    booking_id: data.booking_id
                }, { where: { create_code: data.promotion_code } });
                var previous_price = data.price || 0;
                var charge = resp.price;
                if (resp.discount_type == 1) {
                    charge = (previous_price * resp.price / 100);
                }
                await db.coupon_history.create({ user_id: req.user.id, coupon_id: resp.id, booking_id: data.booking_id, charge: charge, service: data.service });
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

var xlsx = require('node-xlsx');
var fs = require('fs');
const { validateEmail, dateFormat } = require('../commons/helper');

async function bulk_add(req, res) {
    try {
        if (req.user && req.user.id) {
            if (req.file == null) {
                res.status(400).send({
                    status: false,
                    errors: `require file`
                })
            }

            var excel_path = req.file.path;

            if (!excel_path.endsWith('xlsx') && !excel_path.endsWith('csv')) {
                return res.status(400).send({
                    status: false,
                    errors: `Unsupported file format, must xlsx, csv file`
                })
            }
            var obj = xlsx.parse(excel_path); // parses a file

            if (obj.length == 0) {
                return res.status(400).send({
                    status: false,
                    errors: `Cannot parse xlsx`
                })
            }

            var sheetDataList = obj[0].data;
            var count = 0;

            var data = req.body || {};
            for (var i = 0; i < sheetDataList.length; i++) {
                var row = sheetDataList[i];

                try {
                    var email = row[6];
                    if (!validateEmail(email)) continue;
                    var patient = await db.user.findOne({
                        where: { email: email }, include: [
                            {
                                model: db.customer,
                                as: 'customer',
                                where: { user_id: req.user.id }
                            }
                        ]
                    });
                    if (patient == null) continue;

                    var coupon_utilisation = {
                        ...data,
                        patient_id: patient.id,
                        user_id: req.user.id,
                        create_code: row[0],
                        price: row[1],
                        end: new Date(row[8]),
                    }
                    await db.coupon_utilisation.create(coupon_utilisation);

                    // var template = templateOrign;
                    // var templateData = { email: email, password: pwdObj.password };
                    // for (let key in templateData) {
                    //     let str = "${" + key + "}"
                    //     template = template.split(str).join(templateData[key]) //replace All
                    // }
                    // queueEmail(email, 'Docty Health Care: portal Access', { html: template });

                    count++;
                    console.log('count', count)
                } catch (e) {
                    console.log(e)
                }
            }
            try { fs.unlinkSync(excel_path); } catch (e) { }

            res.status(200).send({
                status: true,
                count: count
            })
        } else {
            res.sendStatus(406)
        }
    } catch (error) {
        res.status(400).send({
            status: false,
            errors: `${error}`
        })
    }
}

async function add(req, res, next) {
    let data = req.body;

    if (req.user && req.user.id) {
        data['user_id'] = req.user.id;
        try {
            let resp;
            data.status = 'enable';
            if (data.id == null) resp = await db.coupon_utilisation.create(data);
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

async function downloadCSV(req, res) {
    console.log(req.params.id);
    var user_id = req.params.id;
    db.coupon_utilisation.findAll({
        where: { user_id: user_id }, include: ['patient']
    }).then(resp => {
        var user_list = JSON.parse(JSON.stringify(resp));
        res.setHeader('Content-disposition', 'attachment; filename=coupon_csv.csv');
        res.setHeader('Content-type', 'text/csv');
        res.charset = 'UTF-8';

        var csv = 'code,customer,price,expired,max count,number of usage\n';
        for (var i = 0; i < user_list.length; i++) {
            var coupon = user_list[i];
            var user = coupon.patient;
            var customer = 'Global Coupon';
            if (user) customer = user.fullName;
            var price = `$ ${coupon.price}`;
            if (coupon.discount_type == 1) price = `${coupon.price} %`;
            csv += `${coupon.create_code},${customer},${price},${dateFormat(coupon.end)},${coupon.max_count},${coupon.used_count}\n`
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
}

module.exports = { coupons, coupon, add, bulk_add, deleteCoupon, validate_coupon, downloadCSV }
