const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

/*====signedContract API============*/

function getSignedContractByUser(req, res, next) {
    if (req.user && req.user.id) {
        db.signedContract.findOne({ where: { user_id: req.body.user_id || req.params.user_id || req.query.user_id, status: 1 } }).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: `${err}`
            })
        })

    }
    else {
        res.sendStatus(406)
    }
}

function getSignedContractHistoryByUser(req, res, next) {
    if (req.user && req.user.id) {
        db.signedContract.findAll({ where: { user_id: req.body.user_id || req.params.user_id || req.query.user_id }, order: [['createdAt', 'DESC']], include: ['user_profile_log'] }).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: `${err}`
            })
        })

    }
    else {
        res.sendStatus(406)
    }
}

module.exports = { getSignedContractByUser, getSignedContractHistoryByUser }
