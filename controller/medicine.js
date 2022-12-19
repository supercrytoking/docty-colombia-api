const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

function medicineData(data) {
    return {
        commercialDescription: data.commercialDescription,
        descriptionATC: data.descriptionATC,
        viaAdministration: data.viaAdministration,
        activePrinciple: data.activePrinciple
    }
}

module.exports = {
    getMedicines: async (req, res, next) => {
        if (req.body.product == null || req.body.product.length <= 2) {
            res.status(400).send({
                status: false,
                errors: '"product" filed require'
            })
            return;
        }

        var where = {
            status: 1,
            product: {
                [Op.like]: `%${req.body.product}%`
            }
        }

        db.medicine.findAll({ where: where }).then(resp => {
            res.send(resp)
        }).catch(err => {
            console.log(err)
            res.status(400).send({
                errors: `${err}`,
                success: false
            })
        })
    }, addMedicines: async (req, res, next) => {
        let data = req.body;
        if (req.user && req.user.id) {
            try {
                let resp = await db.medicine.upsert(data);
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
    }, getMedicineDoseTypes: async (req, res, next) => {
        db.medicine_dose_type.findAll().then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                errors: `${err}`,
                success: false
            })
        })
    }, addMedicineDoseType: async (req, res, next) => {
        let data = req.body;
        try {
            let resp = await db.medicine_dose_type.upsert(data);
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
}