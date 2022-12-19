const db = require("../../../models")
var rp = require('request-promise');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

async function syncDoctorInfo(job) {

  let requestHeaders = {
    'api-key': 'NOF72BCLL6Y8MUKJ0MCJ5NTA7QNMJFV8'//`${job.headers.apiKey}`
  }

  let header = JSON.parse(JSON.stringify(requestHeaders));
  let options = {
    uri: `${job.base_url}/api/oeh.medical.physician/search`,
    headers: header,
    method: "get",
    json: true
  };


  if (!!job.last_synced) {
    let d = new Date(job.last_synced).toISOString();
    options.uri = `${job.base_url}/api/oeh.medical.physician/search?domain=[("write_date",">",'${d}')]`
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

async function saveUser(user, user_id) {
  let object = {
    first_name: (user.employee_id && user.employee_id.length && user.employee_id[0].name ? user.employee_id[0].name : ''),
    syncId: `odoo_${(user.employee_id && user.employee_id.length && user.employee_id[0].id ? user.employee_id[0].id : '')}`,
    licence: [{ licence_id: user.code, details: 'Fetch from Odoo' }],
    speciality: user.speciality.map(e => { return { name: e.name } }),
  }
  let u = null;
  try {
    let assoc = await db.associate.scope('').findOne({
      where: { syncId: object.syncId, user_id: user_id }
    });
    if (!!assoc) {
      object.id = assoc.associate;
      u = await db.user.update(object, { where: { id: object.id } });
      for (let lic of object.licence) {
        await db.user_license.findOrCreate({ where: { user_id: object.id, licence_id: lic.licence_id } })
          .then(() => db.user_license.update({ details: lic.details }, { where: { user_id: object.id, licence_id: lic.licence_id } }))
      }
    } else {
      object.associatedTo = { user_id: user_id, syncId: `${object.syncId}` }
      u = await db.user.create(object, { include: ['associatedTo', 'licence'] });
      object.id = u.id;
    }
    for (let spec of object.speciality) {
      let specDb = await db.speciality.findOneOne({
        where: {
          [Op.or]: [
            { title: { [Op.like]: `%${spec.name}%` } },
            { title_es: { [Op.like]: `%${spec.name}%` } },
            { tags: { [Op.like]: `%${spec.name}%` } },
          ]
        }
      })
      if (!!specDb) {
        db.user_service.findOrCreate({
          where: {
            user_id: object.id,
            speciality_id: specDb.id,
            department_id: specDb.department_id
          }
        }).then((resp => resp[0].update({
          service: spec.name
        })))
      }
    }

    return Promise.resolve({ u })
  } catch (error) {
    return Promise.reject(error)
  }
}

module.exports = { syncDoctorInfo }