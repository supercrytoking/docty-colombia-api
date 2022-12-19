const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

/*====professionType API============*/

function professionTypes(req, res, next) {
    // if (req.user && req.user.id) {
        db.professionType.findAll().then(resp => {
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

async function addProfessionType(req, res, next) {
    let data = req.body;
    if (req.user && req.user.id) {
        try {
            let resp = await db.professionType.upsert(data);
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

module.exports = { professionTypes, addProfessionType }
