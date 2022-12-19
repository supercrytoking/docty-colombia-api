const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {
    get_my_reviewer: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;

            db.admin.findOne({
                include: [
                    {
                        model: db.user_profile_reviewer,
                        as: 'user_profile_reviewer',
                        where: {
                            user_id: req.user.id
                        },
                        required: true
                    },
                ]
            }).then(resp => {
                res.send(resp)
            }).catch(err => {
                console.log(err)
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                })
            })
        } else {
            res.sendStatus(406)
        }
    },

}