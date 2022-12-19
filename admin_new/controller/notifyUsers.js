const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { notifyUsers } = require('../../commons/notifyUsers');

module.exports = {

    sendnotificationUsers: async (req, res, next) => {
        let users = req.body.users;
        let modes = req.body.modes;
        let message = req.body.message;
        let phones = users.map(e => e.phone_number);
        let emails = users.map(e => e.email);
        notifyUsers(message, modes, phones, emails).then(resp => {
            console.log(resp);
            res.send({
                status: true
            });
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err,
                error: `${err}`
            });
        });
    }
};
