const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

/*====ethnicityType API============*/

function ethnicityTypes(req, res, next) {
    // if (req.user && req.user.id) {
        db.ethnicityType.findAll({}).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            })
        })

    // }
    // else {
    //     res.sendStatus(406)
    // }
}

async function addEthnicityType(req, res, next) {
    let data = req.body;
    if (req.user && req.user.id) {
        data['user_id'] = req.user.id;
        try {
            let resp = await db.ethnicityType.upsert(data);
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

module.exports = { ethnicityTypes, addEthnicityType }
