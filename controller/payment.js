/* eslint-disable eqeqeq */
/* eslint-disable no-unused-vars */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
var Openpay = require('../opnepay/openpay');
const config = require('../config/config.json');
const { getLimitOffset, limit } = require('../commons/paginator');
const { response, errorResponse } = require('../commons/response');
const isProduction = config.openpay.prodMode;
var openpay = new Openpay(config.openpay.merchantId, config.openpay.privateKey, isProduction);


module.exports = {

    payDirectCard: async (req, res, next) => {
        let data = req.body;
        try {
            let booking = await db.booking.findOne({
                where: {
                    patient_id: req.user.id,
                    reference_id: req.body.reference_id
                },
                include: ['patientInfo']
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
            await booking.update({ payment_status: 'paid' });
            let schedule = await db.schedule.findOne({
                where: {
                    id: booking.schedule_id, start: { [Op.gte]: new Date() }
                }
            });
            if (schedule && schedule.calendarId == 4) {
                await schedule.update({ calendarId: 3, isReadOnly: true, title: req.user.fullname }).then(() => {
                    res.send({
                        status: true,
                        message: 'SERVER_MESSAGE.PAYMENT_SUCCESS_SLOT_CONFIMED',
                        data: booking
                    });
                });
            } else {
                const newCharge = {
                    "method": "card",
                    currency: 'COP',
                    iva: 0,
                    source_id: data.token,
                    'customer': {
                        'name': schedule.patientInfo.first_name || 'Standerd User',
                        'last_name': schedule.patientInfo.first_name || 'Standerd User',
                        'phone_number': schedule.patientInfo.phone_number || '99999999999',
                        'email': schedule.patientInfo.email || 'noreplay@docty.ai'
                    },
                    device_session_id: Date.now().toString(16),
                    "amount": schedule.amount,
                    "description": `${schedule.id}: `,
                    "order_id": Date.now().toString(16)
                };
                openpay.charges.create(newCharge, async (error, body) => {
                    if (error) {
                        console.log(newCharge);
                        return res.status(error.http_code).send(error);
                    } else {
                        await booking.update({ status: 6 }).then(() => {
                            res.send({
                                status: false,
                                message: 'SERVER_MESSAGE.PAYMENT_SUCCESS_SLOT_BUSY',
                                data: schedule
                            });
                        });
                    }
                });
                // await booking.update({ status: 6 }).then(() => {
                //     res.send({
                //         status: false,
                //         message: 'SERVER_MESSAGE.PAYMENT_SUCCESS_SLOT_BUSY',
                //         data: schedule
                //     })
                // })
            }
        } catch (error) {
            return errorResponse(res, error);
        }

    },
    // payViaCard: async (req, res, next) => {
    //     var chargeRequest = {
    //         'method': 'card',
    //         'amount': 100,
    //         'description': 'Cargo inicial a mi cuenta',
    //         'order_id': 'anurag-0055',
    //         'customer': {
    //             'name': 'Anurag',
    //             'last_name': 'Mishra',
    //             'phone_number': '4423456723',
    //             'email': 'anurag@yopmail.com'
    //         },
    //         'currency': 'COP',
    //         'iva': 0,
    //         'send_email': false,
    //         'confirm': false,
    //         'redirect_url': 'https://todonetworks.com'
    //     }

    //     openpay.charges.create(chargeRequest, function (error, charge) {
    //         if (error) {
    //             console.log(error)
    //             return res.send(error)
    //         } else {
    //             console.log(charge)
    //             res.send(charge)
    //         }

    //     });
    // },
    // payViaTocken: async (req, res, next) => {
    //     var chargeRequest = {
    //         'source_id': 'kjbe4xivdbk6zz4aricy',
    //         'method': 'card',
    //         'amount': 100,
    //         'currency': 'COP',
    //         'iva': 0,
    //         'description': 'Cargo inicial a mi cuenta',
    //         'order_id': 'oid-00051',
    //         'device_session_id': 'kR1MiQhz2otdIuUlQkbEyitIqVMiI16f',
    //         'customer': {
    //             'name': 'Juan',
    //             'last_name': 'Vazquez Juarez',
    //             'phone_number': '4423456723',
    //             'email': 'juan.vazquez@empresa.com.mx'
    //         }
    //     }

    //     openpay.charges.create(chargeRequest, function (error, charge) {
    //         if (error) {
    //             console.log(error)
    //             return res.send(error)
    //         } else {
    //             console.log(charge)
    //             res.send(charge)
    //         }

    //     });
    // },

    // createCard: async (req, res, next) => {
    //     var cardRequest = {
    //         'card_number': '4111111111111111',
    //         'holder_name': 'ANURAG MISHRA',
    //         'expiration_year': '22',
    //         'expiration_month': '12',
    //         'cvv2': '120',
    //         'device_session_id': 'kR1MiQhz2otdIuUlQkbEyitIqVMiI16g'
    //     };

    //     openpay.cards.create(cardRequest, function (error, card) {
    //         if (error) {
    //             console.log(error)
    //             return res.send(error)
    //         } else {
    //             console.log(card)
    //             res.send(card)
    //         }

    //     });
    // },
    // getCard: async (req, res, next) => {
    //     openpay.cards.get(req.params.cardId, (error, card) => {
    //         if (error) {
    //             console.log(error)
    //             return res.send(error)
    //         } else {
    //             console.log(card)
    //             res.send(card)
    //         }

    //     });
    // },

    // createToken: async (req, res, next) => {
    //     var token = {
    //         "card_number": "4111111111111111",
    //         "holder_name": "Anurag Mishra",
    //         "expiration_year": "22",
    //         "expiration_month": "12",
    //         "cvv2": "120",
    //         "address": {
    //             "city": "Querétaro",
    //             "line3": "Queretaro",
    //             "postal_code": "76900",
    //             "line1": "Av 5 de Febrero",
    //             "line2": "Roble 207",
    //             "state": "Queretaro",
    //             "country_code": "MX"
    //         }
    //     }
    //     openpay.token.create(token, (error, token) => {
    //         if (error) {
    //             console.log(error)
    //             return res.send(error)
    //         } else {
    //             console.log(token)
    //             res.send(token)
    //         }
    //     });
    // }

};