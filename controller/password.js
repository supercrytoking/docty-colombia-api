/* eslint-disable eqeqeq */
/* eslint-disable no-unused-vars */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const express = require('express');
const bcrypt = require('bcryptjs');
const { timeFormat } = require('../commons/helper');
const { otpTrigger, crmTrigger } = require('../commons/crmTrigger');
const { smsOtpTrigger } = require('../commons/smsCrmTrigger');

const Notification = require('../commons/notification');
const { addActivityLog } = require('./activityLog');

var clientUrl = () => {
    try {
        const config = require(__dirname + '/../config/config.json');
        if (config.client_url) return config.client_url;
    } catch (e) {
        console.log(e);
    }
    return 'https://todonetworks.com';
};


async function resetPassword(req, res, next) {

    try {
        let email = req.body.email;
        let member_id = 0;

        var user = await db.user.findOne({
            where: {
                [Op.or]: [
                    { email: email },
                    { phone_number: email }
                ]
            },
            attributes: ['id', 'first_name', 'middle_name', 'last_name', 'email', 'password', 'isd_code', 'phone_number']
        });
        if (user) {
            var p = await db.user_password_history.findOne({ where: { user_id: user.id, password: user.password, member_id: 0 } });
            if (p == null) await db.user_password_history.create({ user_id: user.id, password: user.password, member_id: 0 });
        }
        if (!!!user) {
            user = await db.user_family.findOne({ where: { email: email } });
            member_id = user.id;
            if (user) {
                var p = await db.user_password_history.findOne({ where: { user_id: user.user_id, password: user.password, member_id: member_id } });
                if (p == null) await db.user_password_history.create({ user_id: user.user_id, password: user.password, member_id: member_id });
            }
        }

        if (!!!user) user = await db.user_authenticator.findOne({ where: { email: email } });

        if (user) {

            const otp = Math.floor(100000 + Math.random() * 900000);

            let responce = await db.pin.create({ user_id: user.id, pin: otp, status: 3 });
            var webUrl = clientUrl();
            try {
                await smsOtpTrigger('Forgot_Password_OTP', {
                    otp: otp,
                    to: `${user.isd_code}${user.phone_number}`
                }, req.lang);
            } catch (error) {

            }
            otpTrigger('Forgot_Password', {
                email: user.email, otp: otp,
                webUrl: webUrl, userName: user.first_name + " " + user.last_name,
                subject: 'Password reset otp'
            }, (user.lang || req.lang || 'en'))
                .then(resp => {
                    res.status(200).send({
                        error: false,
                        status: true,
                        message: 'Opt code is sent to reset password',
                    });
                }).catch(err => {
                    res.status(500).json({
                        error: `${err}`,
                        errors: err,
                        status: false,
                        message: 'Something went wornd',
                    });
                });
        } else {
            res.status(400).send({
                message: 'invalid email',
                status: false
            });
        }
    } catch (e) {
        res.status(400).send({
            error: `${e}`,
            errors: e,
            message: 'Error',
            status: false
        });
    }
}

async function resetPasswordWithOPT(req, res, next) {
    var data = req.body;

    let days = 30;
    let dbDays = await db.credential.findOne({ where: { key: 'PASSWORD_EXPIRY_DAYS' } });
    if (!!dbDays) {
        days = +dbDays.value;
    }
    let todate = new Date().getDate();
    let expiry = new Date(new Date().setDate(todate + days));


    let otp = await db.pin.findOne({ where: { pin: data.otp, status: 3 } });
    if (otp) {
        bcrypt.genSalt(10, async function (err, salt) {
            bcrypt.hash(data.password, salt, async function (err, newPassword) {
                if (err) throw err;
                var user = await db.user.findOne({ where: { id: otp.user_id }, attributes: ['id', 'first_name', 'middle_name', 'last_name', 'email', 'password'] });
                if (user) {
                    var pList = await db.user_password_history.findAll({ where: { user_id: user.id, member_id: 0 } });
                    for (var i = 0; i < pList.length; i++) {
                        var isMatch = await bcrypt.compare(data.password, pList[i].password);
                        if (isMatch) {
                            return res.status(400).send({
                                message: 'Already used password, please use other',
                                status: false
                            });
                        }
                    }
                    await db.user_password_history.create({ user_id: user.id, password: newPassword, member_id: 0 });
                }
                if (!!!user) {
                    user = await db.user_family.findOne({ where: { id: otp.user_id } });
                    if (user) {
                        var pList = await db.user_password_history.findAll({ where: { user_id: user.user_id, member_id: user.id } });
                        for (var i = 0; i < pList.length; i++) {
                            var isMatch = await bcrypt.compare(data.password, pList[i].password);
                            if (isMatch) {
                                return res.status(400).send({
                                    message: 'Already used password, please use other',
                                    status: false
                                });
                            }
                        }
                        await db.user_password_history.create({ user_id: user.user_id, password: newPassword, member_id: user.id });
                    }
                }

                if (!!!user) user = await db.user_authenticator.findOne({ where: { id: otp.user_id } });

                if (user) {
                    await user.update({ password: newPassword, need_password_reset: false, password_expiry: expiry });
                    await db.pin.update({ status: 4 }, { where: { pin: data.otp } });

                    crmTrigger('Password_Reset_Confirmation', { email: user.email, userName: user.fullName, password: data.password, time: timeFormat(new Date(), user.timezone_offset) }, user.lang || req.lang || 'en');
                    res.status(200).json({
                        errors: false,
                        status: true,
                        message: 'Successfully updated new password',
                    });

                } else {
                    res.status(400).send({
                        message: 'Cannot find user',
                        status: false
                    });
                }
            });
        });
    } else {
        res.status(400).send({
            message: 'invalid otp code',
            status: false
        });
    }
}


async function changePassword(req, res, next) {
    if (!req.user || !req.user.id) {
        return res.status(400).send({
            status: false
        });
    }
    try {
        let data = req.body;
        let days = 30;
        let dbDays = await db.credential.findOne({ where: { key: 'PASSWORD_EXPIRY_DAYS' } });
        if (!!dbDays) {
            days = +dbDays.value;
        }
        let todate = new Date().getDate();
        let expiry = new Date(new Date().setDate(todate + days));

        bcrypt.genSalt(10, async function (err, salt) {
            if (err) throw err;

            bcrypt.hash(data.password, salt, async function (err, newPassword) {
                if (err) throw err;
                let user = await db.user.findByPk(req.user.id, { attributes: ['id', 'first_name', 'middle_name', 'last_name', 'email', 'password'] });
                var p = await db.user_password_history.findOne({ where: { user_id: user.id, password: user.password, member_id: 0 } });
                if (p == null) await db.user_password_history.create({ user_id: user.id, password: user.password, member_id: 0 });

                var pList = await db.user_password_history.findAll({ where: { user_id: user.id, member_id: 0 } });
                for (var i = 0; i < pList.length; i++) {
                    var isMatch = await bcrypt.compare(data.password, pList[i].password);
                    if (isMatch) {
                        return res.status(400).send({
                            message: 'Already used password, please use other',
                            status: false
                        });
                    }
                }

                await db.user_password_history.create({ user_id: user.id, password: newPassword, member_id: 0 });

                await db.user.update({
                    password: newPassword,
                    need_password_reset: false,
                    password_expiry: expiry,
                }, { where: { id: req.user.id } });
                addActivityLog({ user_id: req.user.id, type: 'Password Changed' });
                crmTrigger('Password_Reset_Confirmation', { email: user.email, userName: user.fullName, password: data.password, time: timeFormat(new Date(), user.timezone_offset) }, (user.lang || req.lang || 'en'));
                res.status(200).json({
                    errors: false,
                    status: true,
                    message: 'Successfully updated new password',
                });
            });
        });

    } catch (e) {
        res.status(200).json({
            errors: e,
            status: false,
            message: 'Error',
        });
    }
}

//clinic: portal user
async function clinicAuthenticator_changePassword(req, res, next) {
    if (!req.user || !req.user.id) {
        return res.status(400).send({
            status: false
        });
    }
    try {
        let data = req.body;
        console.log('data.user_id', data.user_id);
        let user = await db.user_authenticator.findOne({ where: { id: data.user_id }, attributes: ['password'] });

        // var isMatch = await bcrypt.compare(data.currentPassword, user.password);
        // console.log(isMatch)
        // if (!isMatch) {
        //     return res.status(400).send({
        //         message: 'Please check your current password.',
        //         status: false
        //     });
        // }
        bcrypt.genSalt(10, async function (err, salt) {
            if (err) throw err;

            bcrypt.hash(data.password, salt, async function (err, newPassword) {
                if (err) throw err;
                let user = await db.user_authenticator.findByPk(data.user_id);
                await db.user_authenticator.update({ password: newPassword, need_password_reset: false }, { where: { id: data.user_id } });
                crmTrigger('Password_Reset_Confirmation', { email: user.email, userName: user.fullName, password: data.password, time: timeFormat(new Date(), user.timezone_offset) }, (req.lang || user.lang || 'en'));
                console.log('tes');
                res.status(200).json({
                    errors: false,
                    status: true,
                    message: 'Successfully updated new password',
                });
            });
        });

    } catch (e) {
        res.status(200).json({
            errors: e,
            status: false,
            message: 'Error',
        });
    }
}

module.exports = { resetPassword, resetPasswordWithOPT, changePassword, clinicAuthenticator_changePassword };
