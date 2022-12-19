const Sequelize = require('sequelize');
const { requestAdvisory } = require('../clinic/controllers/advisoryAccess');
const Op = Sequelize.Op;
const db = require("../models");

module.exports.createCustomer = async ({ patientId, clinicId, slug }) => {

    try {
        if (slug) {
            let tk = slug.split("-");
            clinicId = tk.pop();
        }
        if (!clinicId) {
            return null;
        }
        await requestAdvisory({
            patient_id: patientId,
            clinic_id: clinicId,
            approved: 1,
            isDefault: true
        });
        return db.customer
            .create({
                user_id: clinicId,
                customer: patientId,
                location_id: null,
                ips_code: null,
                family_access: true
            })
    } catch (error) {
        return null;
    }
}

module.exports.syncCorporateCustomer = async ({ patientId, corporate_id }) => {

    try {
        let clinic = await db.clinic_corporate_association.findOne({
            where: { associated: true }
        });
        if (clinic && clinic.clinic_id) {
            let type = `corporate::${corporate_id}`;
            let sql = `SELECT id,type,user_id,customer FROM customers c WHERE c.customer = ${patientId} and ( c.user_id =${clinic.clinic_id} or type = "${type}")`;
            let crpt = await db.sequelize.query(sql).spread((r, m) => r[0]);
            if (!crpt || (crpt.user_id != clinic.clinic_id && !crpt.type)) {
                await db.customer.create({ user_id: clinic.clinic_id, customer: patientId, type: type });
            } else {
                if (crpt.type == type)
                    await db.customer.update({ user_id: clinic.clinic_id }, { where: { id: crpt.id, type: type } });

            }
            await db.health_advisor.findOrCreate({
                where: {
                    patient_id: patientId,
                    clinic_id: clinic.clinic_id
                }
            }).then(rr => rr[0].update({ approved: true, family_access: false, isDefault: true }));
            return true;
        }
        return null;

    } catch (error) {
        return null;
    }
}