const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const express = require('express');


module.exports = {
    async addUserContract(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = req.user.id;
            try {
                let resp = await db.user_contract.upsert(data);
                res.send({
                    status: true,
                    data: resp
                });
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: error
                });
            }
        } else {
            res.sendStatus(406);
        }
    },
    async getUserContracts(req, res, next) {
        if (req.user && req.user.id) {
            db.user_contract.findAll({ where: { user_id: req.user.id } }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                });
            });

        }
        else {
            res.sendStatus(406);
        }
    },

    async getContractUsers(req, res, next) {
        if (req.body.contract_id) {
            db.user_contract.findAll({ where: { contract_id: req.body.contract_id } }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                });
            });

        }
        else {
            res.sendStatus(406);
        }
    },
    async getUserContractRow(req, res, next) {
        if (req.user && req.user.id && req.body.contract_id) {
            db.user_contract.findAll({ where: { user_id: req.user.id, contract_id: req.body.contract_id } }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                });
            });

        }
        else {
            res.sendStatus(406);
        }
    },
    async contract(req, res, next) {
        if (req.body.id) {
            db.user_contract.findByPk(req.body.id).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                });
            });

        }
        else {
            res.sendStatus(406);
        }
    }
};
