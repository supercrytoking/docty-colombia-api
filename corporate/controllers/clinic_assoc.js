const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

async function getClinic(id) {
    return db.clinic_corporate_association.findOne({
        where: { corporate_id: id },
        include: [{
            model: db.user,
            as: 'clinic',
            attributes: ['id', 'company_name', 'picture', 'overview'],
            include: 'user_location',
        }]
    })
}

module.exports = {

    getClinicList: async (req, res, next) => {
        db.user.findAll({
            where: { '$user_role.role_id$': 5 },
            include: ['user_role'],
            order: [
                ['company_name', 'asc']
            ]
        }).then(resp => response(res, resp)).catch(err => errorResponse(res, err))
    },
    myClinic: async (req, res) => {
        getClinic(req.user.id).then(resp => res.send(resp))
            .catch(e => res.status(400).send({ status: false, error: `${e}` }));
    },
    async associate(req, res, next) {
        let data = req.body || {};
        db.clinic_corporate_association.findOrCreate({
            where: { corporate_id: req.user.id },
            include: [{
                model: db.user,
                as: 'clinic',
                attributes: ['id', 'company_name', 'picture', 'overview']
            }]
        }).then(async (r) => {
            await r[0].update({ associated: true, synced: false, clinic_id: data.clinic_id, });
            return res.send({ status: true, message: "data will be synced in 30 min", data: await getClinic(req.user.id) })
        }).catch(e => {
            res.status(500).send({ status: false, error: e })
        })
    },
    async resync(req, res, next) {
        let data = req.body || {};
        db.clinic_corporate_association
            .update({ synced: false, }, { where: { corporate_id: req.user.id } })
            .then(async (r) => {
                return res.send({ status: true, message: "data will be synced in 30 min" })
            }).catch(e => {
                res.status(500).send({ status: false, error: e })
            })
    }
}