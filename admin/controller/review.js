const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");


module.exports = {
    async addReview(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['patient_id'] = req.user.id;
            try {
                let resp;
                if (data.id == null) resp = await db.review.create(data);
                else resp = await db.review.upsert(data);

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

    },
    async getPatientReviews(req, res, next) {
        if (req.user && req.user.id) {
            db.review.findAll({ where: { patient_id: req.body.patient_id } }).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                })
            })
        } else {
            res.sendStatus(406)
        }
    },
    async getDoctorReviews(req, res, next) {
        if (req.user && req.user.id) {
            let where = { doctor_id: req.body.doctor_id }
            let page = 1;
            if (!!req.query) {
                if (!!req.query.page) {
                    page = req.query.page;
                }
            }
            let options = {
                page: page,
                paginate: 10,
                where: where,
                include: ['reviewer'],
                order: [['id', 'desc']]
            }
            db.review.paginate(options).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                })
            })
        } else {
            res.sendStatus(406)
        }
    },
    async myReviewToProvider(req, res, next) {
        if (req.user && req.user.id) {
            db.review.findOne({ where: { booking_id: req.body.booking_id, patient_id: req.body.patient_id } }).then(resp => {
                res.send(resp)
            }).catch(err => {
                console.log(err)
                res.status(400).send({
                    status: false,
                    errors: err
                })
            })
        } else {
            res.sendStatus(406)
        }
    },
    async review(req, res, next) {
        if (req.user && req.user.id && req.body.id) {
            db.review.findByPk(req.body.id).then(resp => {
                res.send(resp)
            }).catch(err => {
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