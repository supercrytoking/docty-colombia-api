const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../../models");


module.exports = {
    async emailConversations(req, res, next) {
        if (req.user && req.user.id) {
            db.email_conversation.findAll({
                order: [['createdAt', 'asc']],
                include: [
                    {
                        model: db.email_template,
                        as: 'template',
                        where: {
                            user_id: req.user.id
                        },
                        required: true
                    }
                ]
            }).then(resp => {
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
}