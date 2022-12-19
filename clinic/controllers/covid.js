const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
var os = require('os');
const { response, errorResponse } = require('../../commons/response');
const { getLimitOffset } = require('../../commons/paginator');

module.exports = {

    changeStatus: async(req, res) => {
        let { symptom_status, changed_user_id, changed_admin_id, id } = req.body || {};
        db.covid_checker.update({ symptom_status, changed_user_id, changed_admin_id }, { where: { id } }).then(e => {
            res.send({ status: true })
        }).catch(e => {
            res.send({ status: false, error: `${e}` })
        })
    }

}