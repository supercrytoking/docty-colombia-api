const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { otpTrigger, crmTrigger } = require('../../commons/crmTrigger');
const { smsOtpTrigger, smsTrigger } = require('../../commons/smsCrmTrigger');

const { generateToken, councelling_type, scheduleTimeFormat, getNewPassword, getUserDomain } = require('../../commons/helper');
const { errorResponse } = require('../../commons/response');
const config = require(__dirname + '/../../config/config.json');
const btoa = require('btoa');
const bcrypt = require('bcryptjs');
module.exports = {
    userInfo: async (req, res, next) => {
        if (req.user && req.user.id) {
            var user_id = req.body.id;
            var where = { id: user_id }
            var user = await db.user.findOne({ where: where, attributes: ['id', 'first_name', 'last_name', 'fullName', 'createdAt', 'picture'], include: ['services', 'reviewer'] });

            // Get Today Bookings of user
            var start = new Date();
            start.setHours(0);
            start.setMinutes(0)
            start.setSeconds(0);
            start.setMilliseconds(0);
            var end = new Date(start);
            end.setDate(end.getDate() + 1);
            var todayBookings = await db.booking.findAll({
                where: {
                    provider_id: user_id,
                    status: {
                        [Op.in]: [5, 3, 1]
                    }, // 'accepted', 'complete', 'running'
                    payment_status: 1,
                    // '$schedule.end$': { [Op.gte]: start },
                    // '$schedule.end$': { [Op.lte]: end },
                },
                include: [
                    // 'schedule',
                    {
                        model: db.schedule,
                        as: 'schedule',
                        where: {
                            start: {
                                [Op.gte]: start
                            },
                            end: {
                                [Op.lte]: end
                            }
                        }
                    }
                ]
            });

            //Get Week Bookings of user
            var curr = new Date;
            curr.setHours(0)
            curr.setMinutes(0)
            curr.setSeconds(0)
            var firstday = new Date(curr.setDate(curr.getDate() - curr.getDay()));
            var lastday = new Date(curr.setDate(curr.getDate() - curr.getDay() + 6));
            var weekBookings = await db.booking.findAll({
                where: {
                    provider_id: user_id,
                    status: {
                        [Op.in]: [5, 3, 1]
                    }, // 'accepted', 'complete', 'running'
                    // '$schedule.end$': { [Op.gte]: firstday },
                    // '$schedule.end$': { [Op.lte]: lastday }
                },
                include: [{
                    model: db.schedule,
                    as: 'schedule',
                    where: {
                        start: {
                            [Op.gte]: firstday
                        },
                        end: {
                            [Op.lte]: lastday
                        }
                    }
                }]
            });

            weekBookings = JSON.parse(JSON.stringify(weekBookings));
            // calculate weekly earning
            var weeklyEarning = 0;
            weekBookings.forEach(book => {
                if (book.payment_status == 'paid') {
                    try {
                        if (typeof book.amount == 'string') weeklyEarning += parseFloat(book.amount);
                        else weeklyEarning += book.amount;
                    } catch (e) { }
                }
            });
            console.log('todayBookings', JSON.parse(JSON.stringify(todayBookings)))
            res.send({ user: user, todayBookings: todayBookings, weekBookings: weekBookings, weeklyEarning: weeklyEarning });
        } else {
            res.sendStatus(406)
        }

    },
    patientInfo: async (req, res, next) => {
        if (req.user && req.user.id) {
            var user_id = req.body.id;
            var where = { id: user_id }
            // var family = await db.user_family.findAll({ where: { user_id: user_id } })
            var user = await db.user.findOne({
                where: where, attributes: ['id', 'first_name', 'last_name', 'fullName', 'createdAt', 'picture', 'gender', 'dob'],
                include: ['insurance']
            });

            res.send({
                user: user, // family: family 
            });
        } else {
            res.sendStatus(406)
        }

    },
    myStaffWithSchedule: async (req, res, next) => {
        if (req.user && req.user.id) {
            var user_id = req.user.id;
            if (req.query && req.query.user_id) {
                user_id = req.query.user_id;
            }
            let data = req.body;
            var roles_list = data.roles_list || [];

            var where = { status: 1 };

            let start = new Date()
            let end = new Date();
            end.setFullYear(end.getFullYear() + 1); // getAll schedule [ 1 year ]

            if (req.body.start) {
                start = new Date(req.body.start)
            }
            if (req.body.end) {
                end = new Date(req.body.end)
            }

            db.user.findAll({
                include: [{
                    model: db.user_role,
                    as: 'user_role',
                    where: {
                        role_id: {
                            [Op.in]: roles_list
                        }
                    }
                },
                {
                    model: db.associate,
                    as: 'associate',
                    where: { user_id: user_id }
                },
                    'services',
                {
                    model: db.schedule,
                    as: 'schedule',
                    where: {
                        calendarId: 4,
                        start: {
                            [Op.gte]: start
                        },
                        end: {
                            [Op.lte]: end
                        }
                    },
                    required: false,
                },
                ],
                where: where
            }).then(resp => {
                res.send(resp)
            }).catch(err => {
                console.log(err)
                res.status(400).status({
                    status: false,
                    errors: `${err}`
                })
            })

        } else {
            res.sendStatus(406)
        }
    },


    newBookingGetOtp: async function (req, res, next) {
        if (req.user && req.user.id) {
            var user = req.body;

            var user_id = req.body.id;
            var email = req.body.email;

            const otp = Math.floor(100000 + Math.random() * 900000);
            db.pin.create({ user_id: user_id, pin: otp, status: 0 })
                .then(resp => {
                    otpTrigger('Symptom_Check_Auth_Code', { email: email, subject: 'Docty Health Care: New Booking OTP', userName: user.first_name, otp: otp, text: `Please use this OTP for new booking authentication by agent.` }, req.lang || 'en');

                    res.send({ success: true });
                })
                .catch(err => {
                    res.status(400).status({
                        status: false,
                        errors: `${err}`
                    })
                })
        } else {
            res.sendStatus(406)
        }

    },
    verifyOtp: async function (req, res, next) {
        if (req.user && req.user.id) {
            var user_id = req.body.user_id;
            var otp = req.body.otp;

            db.pin.findOne({ where: { user_id: user_id, pin: otp, status: 0 } })
                .then(async resp => {
                    if (resp) {
                        await db.pin.update({ status: 1 }, { where: { user_id: user_id, pin: otp } })
                        res.send({ success: true });
                    } else res.send({ success: false });
                })
                .catch(err => {
                    res.status(400).status({
                        status: false,
                        errors: `${err}`
                    })
                })
        } else {
            res.sendStatus(406)
        }
    },
    bookingSendInvoice: async (req, res, next) => {
        let data = req.body;
        try {
            let booking = await db.booking.findOne({
                where: {
                    id: data.id
                },
                include: [{
                    model: db.userFamilyView.scope(),
                    foreignKey: 'patient_id',
                    as: 'patientInfo',
                    attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id', 'email', 'isd_code', 'phone_number', 'timezone_offset']
                }, {
                    model: db.user.scope(),
                    foreignKey: 'provider_id',
                    as: 'providerInfo',
                    attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id', 'email', 'phone_number', 'timezone_offset']
                }, 'schedule']
            });

            if (!!!booking) {
                return res.send({
                    status: false,
                    message: 'SERVER_MESSAGE.SONTHING_WRONG',
                    data: booking
                })
            }

            if (booking.amount != data.amount) await db.booking.upsert(data);

            var booking_update_request = {
                booking_id: data.id,
                reason: data.reason,
                old_provider_id: booking.provider_id,
                new_provider_id: booking.new_provider_id,
                status: 'new_booking_by_support',
                by_user: req.user.id
            }

            await db.booking_update_request.create(booking_update_request); // for logging

            var patient = booking.patientInfo || {};
            var provider = booking.providerInfo || {};

            var token_expire = new Date();
            token_expire.setDate(token_expire.getDate() + 1);
            const hash = await generateToken({ name: patient.first_name, group: 'client', role: 2 });
            var tokenObj = await db.token.create({ userId: patient.id, token: hash, expired_at: null, login_as: 0, is_for_link: true });
            tokenObj.update({ expiredAt: token_expire });
            var returnUrl = `/symptoms/billing/${btoa(data.id).replace(/=/g, '')}`;
            var link = `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`;
            var time = '';
            if (booking && booking.schedule) time = scheduleTimeFormat(booking.schedule, patient.timezone_offset);
            otpTrigger('Consultation_Request_Invoice_Patient', {
                email: patient.email,
                subject: 'Docty Health Care: Consultation Invoice',
                your_name: `${patient.first_name} ${patient.last_name}`,
                provider_name: `${provider.first_name} ${provider.last_name}`,
                type: councelling_type(booking.councelling_type),
                company_name: `${req.user.company_name}`,
                time: time,
                link: link
            }, patient.lang || req.lang || 'en');
            smsOtpTrigger('Consultation_Request_Invoice_Patient', {
                link: link,
                to: `${patient.isd_code}${patient.phone_number}`,
                your_name: patient.fullName,
                company_name: `${req.user.company_name}`,
                provider_name: provider.fullName,
            }, patient.lang || req.lang || 'es')
            res.send({ success: true });

        } catch (error) {
            console.log(error)
            return errorResponse(res, error)
        }
    },

    addManager: async function (req, res, next) {
        if (req.user && req.user.id) {
            var data = req.body;
            var resp;
            if (!!data.id) {
                var user_authenticator = await db.user_authenticator.findOne({
                    where: {
                        email: data.email, id: {
                            [Op.ne]: data.id
                        }
                    }
                });
                if (user_authenticator) {
                    return res.status(400).send({
                        status: false,
                        errors: 'EMAIL_UNAVALABLE'
                    })
                }

                user_authenticator = await db.user_authenticator.findOne({
                    where: {
                        phone_number: data.phone_number, id: {
                            [Op.ne]: data.id
                        }
                    }
                });
                if (user_authenticator) {
                    return res.status(400).send({
                        status: false,
                        errors: 'PHONE_UNAVALABLE'
                    })
                }

                resp = db.user_authenticator.upsert(data)
            } else {
                var user_authenticator = await db.user_authenticator.findOne({ where: { email: data.email } });
                if (user_authenticator) {
                    return res.status(400).send({
                        status: false,
                        errors: 'EMAIL_UNAVALABLE'
                    })
                }

                user_authenticator = await db.user_authenticator.findOne({ where: { phone_number: data.phone_number } });
                if (user_authenticator) {
                    return res.status(400).send({
                        status: false,
                        errors: 'PHONE_UNAVALABLE'
                    })
                }

                var pwdObj = await getNewPassword();
                data.password = pwdObj.hashPassword;
                req.body.user_id = req.user.id;
                req.body.need_password_reset = true;

                var parentUser = await db.user.findOne({ where: { id: req.user.id } });
                otpTrigger('Access_Allowed_Clinic_Member', { email: data.email, subject: 'Docty Health Care: portal Access', password: pwdObj.password, added_By: parentUser.fullName, added_By_img: parentUser.picture }, req.lang || 'en')

                resp = db.user_authenticator.create(data);
            }

            resp.then(resp => {
                res.send(resp);
            })
                .catch(err => {
                    res.status(400).status({
                        status: false,
                        errors: `${err}`
                    })
                })
        } else {
            res.sendStatus(406)
        }
    },
    getManagerList: async function (req, res, next) {
        if (req.user && req.user.id) {
            var where = { user_id: req.user.id };
            if (req.query && req.query.id) where = { id: req.query.id }
            db.user_authenticator.findAll({ where: where })
                .then(async resp => {
                    res.send(resp);
                })
                .catch(err => {
                    console.log(err)
                    res.status(400).status({
                        status: false,
                        errors: `${err}`
                    })
                })
        } else {
            res.sendStatus(406)
        }
    },
    deleteManager: async function (req, res, next) {
        if (req.user && req.user.id) {
            db.user_authenticator.destroy({ where: { id: req.body.id } })
                .then(async resp => {
                    res.send(resp);
                })
                .catch(err => {
                    res.status(400).status({
                        status: false,
                        errors: `${err}`
                    })
                })
        } else {
            res.sendStatus(406)
        }
    },

    changePassword: async (req, res) => {
        if (req.user && req.user.id) {
            var password = req.body.password;
            var parentUser = await db.user.findOne({ where: { id: req.user.id } });

            bcrypt.genSalt(10, function (err, salt) {
                if (err) {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    })
                    return
                }
                bcrypt.hash(password, salt, function (err, hashPassword) {
                    if (err) {
                        res.status(400).send({
                            status: false,
                            errors: `${err}`
                        })
                        return
                    }

                    return db.user_authenticator.update({ password: hashPassword }, { where: { id: req.body.id } }).then(async resp => {
                        res.send(resp);
                        otpTrigger('Clinic_Member_Password_Updated', { email: req.body.email, subject: 'Docty Health Care: password updated', password: password, added_By: parentUser.fullName, added_By_img: parentUser.picture }, req.lang || 'en')
                    })
                })
            });

        } else {
            res.sendStatus(406)
        }
    },


    resetTemporaryPassword: async (req, res, next) => {
        try {
            var passwordObject = await getNewPassword();
            let result = await db.user.findOne({ where: { id: req.body.user_id } });
            if (!!result) {
                await result.update({ password: passwordObject.hashPassword, need_password_reset: true });
                crmTrigger('Login_Details_Generated', {
                    email: req.body.email,
                    password: passwordObject.password,
                    link: await getUserDomain(req.body.user_id),
                    provider_name: result.fullName
                }, req.lang || 'en');

                res.status(200).json({
                    error: false,
                    status: "Success",
                    message: 'Password successfully updated !',
                    data: passwordObject.password
                })
            } else {
                return res.status(500).json({
                    'error_code': 109,
                    'status': false,
                    'errors': 'Password Not updated. Please try again !'
                })
            }


        } catch (error) {
            return res.status(500).json({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    }
}