const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

/*====Prescription API============*/

function prescriptions(req, res, next) {
    if (req.user && req.user.id) {
        db.prescription.findAll().then(resp => {//{ include: ['provider', 'patient'] }
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

async function addPrescription(req, res, next) {
    let data = req.body;
    data['user_id'] = req.user.id;
    try {
        let resp = await db.prescription.upsert(data);
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


}

module.exports = { prescriptions, addPrescription }
