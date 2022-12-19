const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { response, errorResponse } = require('../commons/response');

module.exports = {
    getCredentials: async (req, res, next) => {
        db.credential.findAll({
            attributes: ['key', 'value']
        }).then(resp => {
            let obj = {}
            if (resp) {
                resp.forEach(element => {
                    obj[element.key] = element.value;
                });
            }
            return response(res, obj);
        }).catch(err => {
            return errorResponse(res, err);
        })
    }
}