const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const fullName = `CONCAT_WS(' ',u.first_name,NULLIF(u.middle_name,''),NULLIF(u.last_name,''),NULLIF(u.last_name_2,'')) AS fullName`;


module.exports = {
    createRequest: async (req, res, next) => {
        try {
            let corporate_id = req.user.id;
            let data = req.body || {};
            let assClinic = await db.clinic_corporate_association.findOne({ where: { corporate_id, associated: 1 } });
            if (!assClinic) {
                return res.status(400).send({ status: false, error: 'NO_ASSOCIATED_CLINIC' });
            }
            data.clinic_id = assClinic.clinic_id;
            data.corporate_id = corporate_id;
            data.status = true;
            let request = await db.medical_request.create(data);
            return res.send(request);
        } catch (error) {
            return res.status(400).send({ status: false, error: error });
        }
    },
    getRequests: async (req, res, next) => {
        try {
            let query = req.query || {};

            let sq = `SELECT ${fullName}, mr.* FROM medical_requests mr
            JOIN users u ON u.id = mr.patient_id AND u.deletedAt IS NULL
            WHERE (mr.clinic_id = ${req.user.id} OR mr.corporate_id = ${req.user.id})`;
            if (query.clinic_id) {
                sq += ` AND clinic_id = ${query.clinic_id}`
            }
            if (query.corporate_id) {
                sq += ` AND corporate_id = ${query.corporate_id}`
            }
            let request = await db.sequelize.query(sq).spread((r, m) => r);
            return res.send(request);
        } catch (error) {
            return res.status(400).send({ status: false, error: `${error}` });
        }
    },
    getRequest: async (req, res, next) => {
        try {
            let sq = `SELECT ${fullName}, mr.* FROM medical_requests mr
            JOIN users u ON u.id = mr.patient_id AND u.deletedAt IS NULL
            WHERE mr.id = ${req.params.id} AND (mr.clinic_id = ${req.user.id} OR mr.corporate_id = ${req.user.id})`
            let request = await db.sequelize.query(sq).spread((r, m) => r[0]);
            return res.send(request);
        } catch (error) {
            return res.status(400).send({ status: false, error: error });
        }
    },
    updateRequest: async (req, res, next) => {
        try {
            let data = req.body || {};
            delete data.clinic_id;
            delete data.corporate_id;
            let request = await db.medical_request.update(data, {
                where: {
                    id: req.params.id,
                    [Op.or]: [
                        { clinic_id: req.user.id },
                        { corporate_id: req.user.id }
                    ]
                }
            });
            return res.send(request);
        } catch (error) {
            return res.status(400).send({ status: false, error: `${error}` });
        }
    }
}