const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

/*====contractType API============*/

function contractTypes(req, res, next) {
    db.contractType.findAll({}).then(resp => {
        res.send(resp)
    }).catch(err => {
        res.status(400).send({
            status: false,
            errors: err
        })
    })

}

async function addContractType(req, res, next) {
    let data = req.body;
    if (req.user && req.user.id) {
        data['user_id'] = req.user.id;
        try {
            let resp = await db.contractType.upsert(data);
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

module.exports = { contractTypes, addContractType }
