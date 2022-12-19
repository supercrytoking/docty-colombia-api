const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { verifyFamilyMember } = require('../commons/patientMiddleware')


module.exports = {
    async getHistories(req, res, next) {
        let user_id = req.user.id;
        let params = req.params || {};
        if (!!params.user_id) {
            user_id = params.user_id;
        }

        let check = await verifyFamilyMember(req, user_id, req.user.id)
        if (!!!check) {
            return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
        }
        let inst = null;

        inst = db.user_medical_condition.findAll({
            where: {
                user_id: user_id,
                // deleted_at: { [Op.ne]: null }
            },
            include: ['change_by_user'],
            paranoid: false,
            order: [['createdAt', 'desc']]
        })
        inst.then(r => res.send(r)).catch(e => res.status(400).send({ status: false, error: `${e}` }))
    },
    async deleteHistory(req, res, next) {
        let user_id = req.user.id;
        let params = req.params || {};
        if (!!params && !!params.user_id) {
            user_id = +params.user_id;
        }
        let check = await verifyFamilyMember(req, user_id, req.user.id)
        if (!!!check) {
            return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
        }
        let inst = null;

        inst = db.user_medical_condition.destroy({
            where: { id: params.id, user_id: user_id },
            force: true
        })
        inst.then(r => res.send({ status: true })).catch(e => res.status(400).send({ status: false, error: `${e}` }))
    }
};