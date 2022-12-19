const db = require("../../../models")
var rp = require('request-promise');
const { include } = require("underscore");

const syncAppointmentInfo = async (job) => {

  let requestHeaders = {
    'api-key': 'NOF72BCLL6Y8MUKJ0MCJ5NTA7QNMJFV8'//`${job.headers.apiKey}`
  }
  let header = JSON.parse(JSON.stringify(requestHeaders));
  let options = {
    uri: `${job.base_url}/api/oeh.medical.appointment/search`,
    headers: header,
    method: "get",
    json: true
  };

  if (!!job.last_synced) {
    let d = new Date(job.last_synced).toISOString();
    options.uri = `${job.base_url}/api/oeh.medical.appointment/search?domain=[("write_date",">",'${d}')]`
  }
  let promises = []
  return rp(options).then(resp => {
    if (!!resp && !!resp.data) {
      for (let data of resp.data) {
        promises.push(saveUser(data, job.user_id))
      }
    }
    return Promise.all(promises)
  }).catch(e => {
    db.his_info.update({ errors: e }, { where: { id: job.id } }).catch(e => console.log(e));
  })
}
function endTime(date) {
  let d = new Date(date);
  d.setMinutes(d.getMinutes() + 30);
  return new Date(d);
}
async function getDoctor(id, user_id) {
  return db.associate.findOne({
    where: {
      user_id: user_id, syncId: `odoo_${id}`
    }
  })
}
async function getPatient(id, user_id) {
  return db.customer.findOne({
    where: {
      user_id: user_id, syncId: `odoo_${id}`
    },
    include: ['employee']
  })
}
async function saveUser(appointment, user_id) {
  try {
    let doctor = await getDoctor(appointment.doctor[0].id, user_id);
    let patient = await getPatient(appointment.patient[0].id, user_id);
    let object = {
      reference_id: appointment.name,
      description: appointment.comments,
      schedule: {
        start: new Date(appointment.appointment_date),
        end: endTime(appointment.appointment_date),
        user_id: doctor.associate,
        title: (patient.employee ? patient.employee.fullName : patient.customer),
        categoty: 'time',
        isReadOnly: 1,
        isAllDay: 0,
        state: 'Busy',
        reference_id: appointment.name
      },
      provider_id: doctor.associate,
      patient_id: patient.customer,
      amount: 0,
      status: "complete",
      payment_status: "paid",
      councelling_type: 'visit'
    }
    let u = null;
    let book = await db.booking.findOne({
      where: { reference_id: object.reference_id }
    });
    if (!!book) {
      u = await Promise.all([
        book.update(object),
        db.schedule.update(object.schedule, { where: { id: book.schedule_id } })
      ])
    } else {
      u = await db.booking.create(object, { include: ['schedule'] })
    }
    return Promise.resolve({ u })
  } catch (error) {
    return Promise.reject(error)
  }
}

module.exports = { syncAppointmentInfo }