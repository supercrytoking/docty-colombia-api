const db = require("../models")
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
var rp = require('request-promise');
const config = require(__dirname + '/../config/config.json');

const getEndDate = (start, scheduleList) => {
  let end = 0;
  let doseA = 0
  scheduleList.forEach(e => {
    if (e.doseDuration > end) end = e.doseDuration;
    if (e.doseAmount > doseA) doseA = e.doseAmount;
  })
  let endDate = new Date(new Date(start).setDate(new Date(start).getDate() + end))
  let dose = `${doseA} ${scheduleList.length ? scheduleList[0].doseType : ''}`
  return { endDate, dose }
}

const migrate = async (reference_id = null) => {
  let data = [];
  let where = {
    medications: { [Op.ne]: null }
  }
  if (!!reference_id) {
    where.reference_id = reference_id
  }
  let prescriptions = await db.prescription.findAll({
    where: where,
    include: [{
      model: db.booking, as: 'booking', required: true
    }]
  });
  prescriptions.forEach(r => {
    if (typeof r.medications == 'string') r.medications = JSON.parse(r.medications);
    r.medications.forEach(e => {
      let ed = getEndDate(r.createdAt, e.scheduleList);
      data.push({
        user_id: r.booking.patient_id,
        family_id: (r.booking.family_member_id || 0),
        added_by: r.booking.provider_id,
        reference_id: r.reference_id,
        class: 'prescription',
        response: {
          "startDate": r.createdAt,
          "endDate": ed.endDate,
          "taken_for": "",
          "type": (e.medicineObj.descriptionATC || ''),
          "name": e.name,
          "dose": ed.dose,
        },
        notes: (r.note || '').replace(/(<([^>]+)>)/ig, '')
      })
    });
  })
  if (!!data.length) {
    // return console.log(data)
    return db.userMedicalHistory.bulkCreate(data, { returning: true })
  } else {
    return Promise.resolve();
  }

}

module.exports = { migrate }
