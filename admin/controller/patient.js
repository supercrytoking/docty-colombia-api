/* eslint-disable eqeqeq */
/* eslint-disable no-unused-vars */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { addActivityLog } = require('./activityLog');

const Openpay = require('../../opnepay/openpay');
const { generateToken, councelling_type, scheduleTimeFormat } = require('../../commons/helper');
const { crmTrigger, otpTrigger } = require('../../commons/crmTrigger');
const { errorResponse, response } = require('../../commons/response');
const config = require(__dirname + '/../../config/config.json');
const isProduction = config.openpay.prodMode;
const openpay = new Openpay(config.openpay.merchantId, config.openpay.privateKey, isProduction);

const btoa = require('btoa');
const { smsOtpTrigger } = require('../../commons/smsCrmTrigger');

/*====Patient History API============*/

async function createHistory(req, res, next) {
    let data = req.body;
    if (req.user && req.user.id) {
        data['user_id'] = data.user_id;
        try {
            let resp = await db.symptom_history.upsert(data);
            res.send({
                status: true,
                data: resp
            });
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            });
        }
    } else {
        res.sendStatus(406);
    }

}

async function getFullHistory(req, res, next) {
    if (req.user && req.user.id) {
        db.symptom_history.findAll({ where: { user_id: req.body.user_id } }).then(resp => {
            res.send(resp);
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            });
        });

    }
    else {
        res.sendStatus(406);
    }
}

async function history(req, res, next) {
    if (req.user && req.user.id && req.body.id) {
        db.symptom_history.findByPk(req.body.id).then(resp => {
            res.send(resp);
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            });
        });

    }
    else {
        res.sendStatus(406);
    }
}

/*====Patient Insurance API============*/

async function addInsurance(req, res, next) {
    let data = req.body;
    if (req.user && req.user.id) {
        data['added_by_admin'] = req.user.id;
        data.addedBy = null;

        if (!!!data['end_date']) {
            data['end_date'] = null
        }
        if (!!!data['member_id']) {
            data['member_id'] = 0
        }
        if (!!!data.type) {
            data.type = 'individual'
        }
        if (data.type == 'individual') {
            delete data.members
        }
        if (!!data.is_no_insurance) {
            return db.user_insurance.destroy({ where: { user_id: data.user_id, member_id: data.member_id } }).then(resp => {
                return res.send({
                    status: true,
                    data: resp
                })
            })
        }
        let inst = null;
        try {
            if (!!data.id) {
                await db.user_insurance.update(data, { where: { id: data.id } });
                if (!!data.members && !!data.members.length) {
                    let memberIds = []//data.members.map(e => e.member_id);
                    let members = [];
                    let suf = 1;
                    data.members.forEach(element => {
                        if (element.isCovered) {
                            memberIds.push(element.member_id);
                            if (!!element.isPrimary) {
                                element.policy_number = data.card_number
                                data.member_id = element.member_id;
                            }
                            else {
                                element.policy_number = data.card_number + `-(${suf++})`
                            }
                            members.push(element)
                        }
                    });
                    data.members = members;
                    await db.user_insurance_member.destroy({
                        where: {
                            user_id: (data.user_id || req.user.id),
                            insurance_id: data.id,
                            member_id: { [Op.notIn]: memberIds }
                        }
                    });
                    for (let m of data.members) {
                        let a = await db.user_insurance_member.findOrCreate({
                            where: {
                                user_id: data.user_id,
                                member_id: m.member_id,
                                insurance_id: data.id,
                            }
                        })
                            .then(resp => {
                                resp[0].update(m);
                                return resp[0]
                            })
                    }
                }
                inst = db.user_insurance.findByPk(data.id, { include: ['members'] });
            } else {
                if (!!data.members && !!data.members.length) {
                    data.members = data.members.map(e => {
                        e.user_id = data.user_id;
                        return e;
                    });
                }
                inst = db.user_insurance.create(data, { include: ['members'] })
            }
            inst.then(async (resp) => {
                res.send({
                    status: true,
                    data: resp
                })
            })
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: `${error}`
            })
        }
    } else {
        res.sendStatus(406)
    }

}

async function removeInsurance(req, res, next) {
    if (req.user && req.user.id && req.body.id) {
        try {
            let resp = await db.user_insurance.destroy({ where: { id: req.body.id } });
            res.send({
                status: true,
                data: resp
            });
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            });
        }
    }
    else {
        res.sendStatus(406);
    }
}

async function insurances(req, res, next) {
    if (req.query && req.query.user_id) {
        user_id = req.query.user_id;
    }
    let where = { user_id: user_id };
    if (req.query && req.query.member_id) {
        where = {
            user_id: user_id,
            [Op.or]: [
                { member_id: req.query.member_id },
                { '$members.member_id$': req.query.member_id }
            ]
        };
    }

    db.user_insurance.scope('').findAll({
        where: where,
        attributes: {
            include: [
                [db.sequelize.col("insurance_provider.name"), 'company_name']
            ]
        },
        include: ['members', {
            model: db.insurence_provider, as: 'insurance_provider',
            attributes: []
        }, {
                model: db.user,
                as: 'added_by_user',
                attributes: ['first_name', 'last_name', 'fullName', 'middle_name', 'last_name_2']
            },
            {
                model: db.admin,
                as: 'added_by_admin_user',
                attributes: ['first_name', 'last_name', 'fullName']

            }
        ]
    }).then(async (resp) => {
        let respo = JSON.parse(JSON.stringify(resp));
        for (ress of respo) {
            let memb = await db.user_insurance_member.findAll({ where: { insurance_id: ress.id } })
            ress.members = JSON.parse(JSON.stringify(memb));
        }
        res.send(respo)
    }).catch(err => {
        res.status(400).send({
            status: false,
            errors: `${err}`
        })
    })

}

async function insurance(req, res, next) {
    if (req.user && req.user.id && req.body.id) {
        db.user_insurance.findByPk(req.body.id).then(resp => {
            res.send(resp);
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            });
        });

    }
    else {
        res.sendStatus(406);
    }
}
async function getMemberInsurance(req, res, next) {
    if (req.user && req.user.id) {
        db.user_insurance.findOne({
            where: {
                user_id: req.body.user_id,
                member_id: req.body.member_id
            }
        }).then(resp => {
            res.send(resp);
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: req.body
            });
        });
    }
    else {
        res.sendStatus(406);
    }
}


/*====Patient Medical API============*/

async function addMedical(req, res, next) {
    let data = req.body;
    if (req.user && req.user.id) {
        data['user_id'] = data.user_id;
        data['added_by_admin'] = req.user.id;
        try {
            addActivityLog({ user_id: req.user.id, type: 'Medical_Record_Update' });
            await db.user_medical.destroy({ where: { user_id: data.user_id } });
            if (data.id)
                delete data.id;
            let resp = await db.user_medical.create(data);
            // await resp[0].update(data);
            res.send({
                status: true,
                data: resp
            })
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error//`${error}`
            })
        }
    } else {
        res.sendStatus(406);
    }

}

async function medicals(req, res, next) {
    if (req.user && req.user.id && req.query) {
        db.user_medical.findOne({ where: { user_id: req.query.user_id } }).then(resp => {
            res.send(resp);
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            });
        });

    }
    else {
        res.sendStatus(406);
    }
}
async function allMedicals(req, res, next) {
    if (req.user && req.user.id && req.query) {
        db.user_medical.findAll({
            where: { user_id: req.query.user_id },
            paranoid: false,
            order: [['createdAt', 'desc']],
            include: [{
                model: db.user,
                as: 'change_by_user',
                attributes: ['first_name', 'middle_name', 'last_name', 'last_name_2', 'company_name', 'fullName']
            },
            {
                model: db.admin,
                as: 'added_by_admin_user',
                attributes: ['first_name', 'last_name']
            }
            ]
        }).then(resp => {
            res.send(resp);
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            });
        });

    }
    else {
        res.sendStatus(406);
    }
}

async function patientInfo(req, res, next) {
    if (req.user && req.user.id) {
        var user_id = req.body.id;
        var where = { id: user_id };
        var family = [];
        var user = await db.user.findOne({ where: where, attributes: ['id', 'first_name', 'last_name', 'fullName', 'createdAt',], include: ['insurance'] });
        family = await user.getFamilies()
            .map(r => {
                let user = r.user.toJSON();
                user.relation = r.relation;
                return user;
            });
        res.send({ user: user, family: family });
    } else {
        res.sendStatus(406);
    }

}

async function bookingUpdatePayment(req, res, next) {
    let data = req.body;
    let amount = 0;
    try {
        let booking = await db.booking.findOne({
            where: {
                patient_id: data.patient_id,
                reference_id: req.body.reference_id
            },
            include: ['patientInfo', {
                model: db.user.scope(),
                foreignKey: 'provider_id',
                as: 'providerInfo',
                attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id', 'email', 'phone_number']
            }]
        });
        if (!!!booking) {
            return res.send({
                status: false,
                message: 'SERVER_MESSAGE.SONTHING_WRONG',
                data: booking
            });
        }

        if (booking && booking.payment_status == 'paid') {
            return res.send({
                status: false,
                message: 'SERVER_MESSAGE.ALREADY_PAID',
                data: booking
            });
        }

        // await booking.update({ payment_status: 'paid' });
        let schedule = await db.schedule.findOne({
            where: {
                id: booking.schedule_id, start: { [Op.gte]: new Date() }
            }
        });
        let consuslt_type = await db.consultation_type_detail.findOne({
            where: {
                language: req.lang || 'en',
                type_code: booking.councelling_type
            }
        });
        if (!!consuslt_type) {
            amount = consuslt_type.price;
        }
        if (!!data.promotion_code) {
            let coupon = await db.coupon_utilisation.findOne({
                where: {
                    create_code: data.promotion_code, type: data.coupon_type,
                    status: true,
                    start: { [Op.lte]: new Date() },
                    end: { [Op.gte]: new Date() },
                }
            });
            if (coupon) {
                amount = parseFloat(amount) - parseInt(coupon.price);
                amount = amount > 0 ? amount : 0;
            }
        }

        if (amount < 1) {
            return booking.update({ payment_status: 'paid', amount: amount }).then(() => {
                res.send({
                    status: true,
                    message: 'SERVER_MESSAGE.PAYMENT_SUCCESS_SLOT_CONFIMED',
                    data: booking
                });
            });
        }
        if (schedule && schedule.calendarId == 4) {
            await schedule.update({ calendarId: 3, isReadOnly: true, title: booking.patientInfo.fullName, state: 'Busy' }).then(() => {
                const newCharge = {
                    "method": "card",
                    currency: 'COP',
                    iva: 0,
                    source_id: data.token,
                    'customer': {
                        'name': booking.patientInfo.first_name || 'Standerd User',
                        'last_name': booking.patientInfo.last_name || 'Standerd User',
                        'phone_number': booking.patientInfo.phone_number || '99999999999',
                        'email': booking.patientInfo.email || 'noreplay@docty.ai'
                    },
                    device_session_id: Date.now().toString(16),
                    "amount": amount,
                    "description": `${booking.id}: `,
                    "order_id": Date.now().toString(16)
                };
                return openpay.charges.create(newCharge, async (error, body) => {
                    if (error) {
                        schedule.update({ calendarId: 4, isReadOnly: true, title: 'Available' });
                        return res.status(error.http_code).send(error);
                    } else {
                        await booking.update({ payment_status: 'paid', amount: amount }).then(() => {
                            return res.send({
                                status: true,
                                message: 'SERVER_MESSAGE.PAYMENT_SUCCESS_SLOT_CONFIMED',
                                data: booking
                            });
                        });
                    }
                });
            });
        } else {
            await booking.update({ status: 'slotBusy' }).then(() => {
                res.send({
                    status: false,
                    message: 'SERVER_MESSAGE.PAYMENT_FAILED_SLOT_BUSY',
                    data: schedule
                });
            });
        }
    } catch (error) {
        console.log(error);
        return errorResponse(res, error);
    }
}


async function bookingSendInvoice(req, res, next) {
    let data = req.body;
    try {
        let booking = await db.booking.findOne({
            where: {
                id: data.id
            },
            include: [{
                model: db.userFamilyView,
                foreignKey: 'patient_id',
                as: 'patientInfo',
                attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id', 'email', 'isd_code', 'phone_number', 'timezone_offset', 'lang']
            }, {
                model: db.user,
                foreignKey: 'provider_id',
                as: 'providerInfo',
                attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id', 'email', 'phone_number', 'lang']
            }, 'schedule']
        });

        if (!!!booking) {
            return res.send({
                status: false,
                message: 'SERVER_MESSAGE.SONTHING_WRONG',
                data: booking
            });
        }

        if (booking.amount != data.amount) await db.booking.upsert(data);

        var booking_update_request = {
            booking_id: data.id,
            reason: data.reason,
            old_provider_id: booking.provider_id,
            new_provider_id: booking.new_provider_id,
            status: 'new_booking_by_support',
            by_admin: req.user.id
        };

        await db.booking_update_request.create(booking_update_request); // for logging

        var patient = booking.patientInfo;
        var provider = booking.providerInfo;

        var token_expire = new Date();
        token_expire.setDate(token_expire.getDate() + 1);
        const hash = await generateToken({ name: patient.first_name, group: "client", role: 2 });
        var tokenObj = await db.token.create({ userId: patient.id, token: hash, expired_at: null, login_as: 0, is_for_link: true });
        tokenObj.update({ expiredAt: token_expire });
        var returnUrl = `/symptoms/billing/${btoa(data.id).replace(/=/g, '')}`;
        var link = `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`;
        var time = '';
        if (booking && booking.schedule) time = scheduleTimeFormat(booking.schedule, patient.timezone_offset);
        otpTrigger('Consultation_Request_Invoice_Patient', {
            email: patient.email,
            subject: 'Docty Health Care: Consultation Invoice',
            your_name: patient.fullName,
            provider_name: provider.fullName,
            company_name: req.user.id || 'Docty Inc.',
            type: councelling_type(booking.councelling_type),
            time: time,
            link: link
        }, patient.lang || req.lang || 'en');
        smsOtpTrigger('Consultation_Request_Invoice_Patient', {
            link: link,
            to: `${patient.isd_code}${patient.phone_number}`,
            your_name: patient.fullName,
            provider_name: provider.fullName,
        }, patient.lang || req.lang || 'es')
        res.send({ success: true });

    } catch (error) {
        console.log(error);
        return errorResponse(res, error);
    }
}

async function insuranceReleafe(req, res, next) {
    if (req.user && req.user.id) {
        let where = {
            type_code: req.body.type_code,
            insurance_provider_id: req.body.insurance_provider_id,
            // '$company.associate.id$': 1
        };

        let data = req.body;
        let sql = `SELECT MAX(cs.insured_cover) insured_cover,cs.copay,cs.total,cs.id FROM company_services cs,associates a
      WHERE cs.user_id = a.user_id AND a.associate= ${data.provider_id} AND  cs.type_code = "${data.type_code}" AND cs.insurance_provider_id = ${data.insurance_provider_id}`;

        db.sequelize.query(sql).spread((resp) => response(res, resp[0]))
            .catch(err => errorResponse(res, err));

    } else {
        res.sendStatus(406);
    }
}
async function deletemedicalPermanent(req, res, next) {
    if (req.user && req.user.id) {
        db.user_medical.destroy({ where: { id: req.params.id }, force: true }).then(resp => {
            res.send({ success: true })
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

module.exports = { createHistory, getFullHistory, history, addInsurance, removeInsurance, insurances, insurance, addMedical, medicals, getMemberInsurance, patientInfo, bookingUpdatePayment, bookingSendInvoice, insuranceReleafe, allMedicals, deletemedicalPermanent };
