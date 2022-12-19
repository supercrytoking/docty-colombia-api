const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const express = require('express');
const { addActivityLog } = require('./activityLog');

module.exports = {
    async getSurvey(req, res, next) {
        if (req.body.survey_id) {
            db.survey.findAll({ where: { id: req.body.survey_id } }).then(resp => {
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
    },
    async addResponse(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = req.user.id;
            try {
                let resp = await db.survey_response.upsert(data);
                res.send({
                    status: true,
                    data: resp
                });
                addActivityLog({ user_id: req.user.id, type: 'Feedback', details: `` });
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
    async getUserResponses(req, res, next) {
        if (req.user && req.user.id) {
            db.survey_response.findAll({ where: { user_id: req.user.id } }).then(resp => {
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
    },
    async getSurveyResponses(req, res, next) {
        if (req.body.survey_id) {
            db.survey_response.findAll({ where: { survey_id: req.body.survey_id } }).then(resp => {
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
    },
    async getUserSurveyResponse(req, res, next) {
        if (req.user && req.user.id && req.body.survey_id) {
            db.survey_response.findAll({ where: { user_id: req.user.id, survey_id: req.body.survey_id } }).then(resp => {
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
    },
    async response(req, res, next) {
        if (req.body.id) {
            db.survey_response.findByPk(req.body.id).then(resp => {
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
