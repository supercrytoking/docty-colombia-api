const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {
    async sliders(req, res, next) {
        // if (req.user && req.user.id) {

        // let where = { language: req.lang };
        let where = {};
        if (req.query && req.query.language) {
            where.language = req.query.language;
        }
        if (req.query && req.query.user_role) {
            where.user_role = req.query.user_role;
        }

        db.slider.scope('activeOnly').findAll({ where: where })
            .then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                })
            })
        // }
        // else {
        //     res.sendStatus(406)
        // }
    },

}