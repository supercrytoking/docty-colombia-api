const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");


module.exports = {
    associateCC: async () => {
        let clinic_id = null;
        let corporate_id = null;
        let ass = await db.clinic_corporate_association.findOne({
            where: { associated: true, synced: false }
        })
        let customers = [];
        let type = null;
        if (ass) {
            clinic_id = ass.clinic_id;
            corporate_id = ass.corporate_id;
            type = `corporate::${corporate_id}`;
            customers = await db.customer.findAll({
                where: {
                    user_id: corporate_id
                },
                include: [{
                    model: db.user,
                    as: "employee",
                    attributes: ['id', 'first_name'],
                    required: true,
                }]
            });
        }
        // console.log(customers);
        if (customers.length) {
            customers.forEach(async (element) => {
                console.log(element.toJSON())
                let sql = `SELECT id,type,user_id,customer FROM customers c WHERE c.customer = ${element.customer} and ( c.user_id =${clinic_id} or type = "${type}")`;
                let crpt = await db.sequelize.query(sql).spread((r, m) => r[0]);
                if (!crpt || (crpt.user_id != clinic_id && !crpt.type)) {
                    await db.customer.create({ user_id: clinic_id, customer: element.customer, type: type });
                } else {
                    if (crpt.type == type)
                        await db.customer.update({ user_id: clinic_id }, { where: { id: crpt.id, type: type } });

                }
                await db.health_advisor.findOrCreate({
                    where: {
                        patient_id: element.customer,
                        clinic_id: clinic_id
                    }
                }).then(rr => rr[0].update({ approved: true, family_access: false, isDefault: true }));
            });
        }
        if (ass)
            await db.clinic_corporate_association.update({ synced: true }, {
                where: { id: ass.id }
            })
    }
}
module.exports.associateCC();