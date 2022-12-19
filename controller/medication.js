const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {
    getMedications: async (req, res, next) => {
        db.medication.findAll().then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                errors: `${err}`,
                success: false
            })
        })
    }, addMedication: async (req, res, next) => {
        let data = req.body;
        if (req.user && req.user.id) {
            try {
                let resp = await db.medication.upsert(data);
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
    }, getMedicationSlots: async (req, res, next) => {
        db.medication_slot.findAll().then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                errors: `${err}`,
                success: false
            })
        })
    }, getMedicationConditions: async (req, res, next) => {
        db.medication_condition.findAll().then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                errors: `${err}`,
                success: false
            })
        })
    }, getMedicationTypes: async (req, res, next) => {
        db.medication_type.findAll().then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                errors: `${err}`,
                success: false
            })
        })
    }, getMedicationDurations: async (req, res, next) => {
        db.medication_duration.findAll().then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                errors: `${err}`,
                success: false
            })
        })
    }, addMedicationSlot: async (req, res, next) => {
        let data = req.body;
        try {
            let resp = await db.medication_slot.upsert(data);
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
    }, addMedicationCondition: async (req, res, next) => {
        let data = req.body;
        try {
            let resp = await db.medication_condition.upsert(data);
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
    }, addMedicationType: async (req, res, next) => {
        let data = req.body;
        try {
            let resp = await db.medication_type.upsert(data);
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
    }, addMedicationDuration: async (req, res, next) => {
        let data = req.body;
        try {
            let resp = await db.medication_duration.upsert(data);
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