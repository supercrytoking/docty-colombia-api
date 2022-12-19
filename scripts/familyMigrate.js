const db = require("../models")
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
var rp = require('request-promise');
const config = require(__dirname + '/../config/config.json');

async function removeDeleted() {
  return await db.sequelize.query(`delete from user_families where deletedAt is not null`).then(() => console.log('done'))
}
function getUsers() {
  let sql = `SELECT uf.*,u.country_id,u.isd_code,uf.ethnicity ethnicity_id, uf.phone phone_number, uf.id family_id,
  uf.note overview, uf.image picture
        FROM user_families uf
        JOIN users  u ON u.id = uf.user_id
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.deletedAt IS NULL
        AND uf.deletedAt IS NULL
        AND ur.role_id = 2
        ORDER BY uf.user_id
        LIMIT 50`;
  db.sequelize.query(sql).spread(async (us, m) => {
    for (let u of us) {
      u = JSON.parse(JSON.stringify(u))
      delete u.id;
      // console.log(u)
      try {
        let user = await db.user.create(u);
        await db.user_kindred.create({ user_id: u.user_id, member_id: user.id, relation: u.relation, allow_access: u.allow_access });
        await db.address.update({ user_id: user.id }, { where: { family_id: u.family_id } });
        await db.booking.update({ patient_id: user.id, booked_by: u.user_id }, { where: { family_member_id: u.family_id } });
        await db.covid_checker.update({ user_id: user.id, added_by: u.user_id }, { where: { family_member_id: u.family_id } });
        await db.review.update({ user_id: user.id }, { where: { family_member_id: u.family_id } });
        await db.symptom_analysis.update({ user_id: user.id, added_by: u.user_id }, { where: { family_id: u.family_id } });
        await db.userMedicalHistory.update({ user_id: user.id, added_by: u.user_id }, { where: { family_id: u.family_id } });
        await db.user_insurance.update({ user_id: user.id, addedBy: u.user_id }, { where: { member_id: u.family_id } });
        await db.user_insurance_member.update({ member_id: user.id }, { where: { member_id: u.family_id } });
        await db.user_insurance_member.update({ member_id: u.user_id }, { where: { member_id: 0, user_id: u.user_id } });
        await db.user_insurance_member.update({ user_id: user.id }, { where: { member_id: u.family_id, isPrimary: 1 } });

        await db.family_document.update({ user_id: user.id, family_id: null }, { where: { family_id: u.family_id } });
        await db.family_medical.update({ user_id: user.id, family_id: null }, { where: { family_id: u.family_id } });
        await db.family_medical_condition.update({ user_id: user.id, member_id: null }, { where: { member_id: u.family_id } });
        await db.user.update({ emergency_contact: user.id }, { where: { emergency_contact: u.family_id } });
        await db.user_family.update({ deletedAt: new Date(), note: user.id }, { where: { id: u.family_id } })
      } catch (error) {
        console.log(error)
      }
    }
    // process.exit();
  })
}

async function copyRecord() {
  await db.sequelize.query(`UPDATE user_documents ud,user_families uf SET ud.user_id = uf.note WHERE uf.id = ud.family_id`);
}

module.exports = { getUsers }
// getUsers()
// copyRecord()