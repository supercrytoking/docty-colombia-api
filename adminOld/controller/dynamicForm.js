const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const bcrypt = require('bcryptjs');
const { generateToken } = require('../../commons/helper');

module.exports = {
    addMedicalQuestion: async (req, res, next) => {
        let data = req.body;
        data['category'] = data['category'] || 'medical';
        db.user_questionnaires.upsert(req.body).then(resp => {

            res.send(resp);
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: `${err}`
            });
        });
    },
    getMedicalContitions: async (req, res, next) => {
        db.user_questionnaires.findAll().then(resp => {
            res.send(resp);
        }).catch(err => {
            res.status(400).send({
                errors: `${err}`,
                success: false
            });
        });
    },
    deleteMedicalQuestion: async (req, res, next) => {
        db.user_questionnaires.destroy({ where: { id: req.body.id } })
            .then(resp => {
                res.send({ resp });
            })
            .catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                });
            });
    }
};