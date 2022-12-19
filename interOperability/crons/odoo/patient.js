const db = require("../../../models")
var rp = require('request-promise');

const syncPatientInfo = async (job) => {

  let requestHeaders = {
    'api-key': `${job.headers.apiKey}`
  }

  let header = JSON.parse(JSON.stringify(requestHeaders));
  let options = {
    uri: `${job.base_url}/api/oeh.medical.patient/search`,
    headers: header,
    method: "get",
    json: true
  };

  if (!!job.last_synced) {
    let d = new Date(job.last_synced).toISOString();
    options.uri = `${job.base_url}/api/oeh.medical.patient/search?domain=[("write_date",">",'${d}')]`
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
    first_name: (user.partner_id && user.partner_id.length && user.partner_id[0].name ? user.partner_id[0].name : ''),
    ethnicity_others: (user.ethnic_group && user.ethnic_group.length && user.ethnic_group[0].name ? user.ethnic_group[0].name : null),
    dob: user.dob,
    syncId: `odoo_${(user.partner_id && user.partner_id.length && user.partner_id[0].id ? user.partner_id[0].id : '')}`,
    ips_code: user.identification_code,
    blood_group: user.blood_type + user.rh,
    gender: (user.sex || '').toUpperCase(),
    country_id: '47',
    status: 1,
    user_medical: {
      blood_group: user.blood_type + user.rh,
    },
    customer: {
      user_id: user_id,
      ips_code: user.identification_code,
      syncId: `odoo_${(user.partner_id && user.partner_id.length && user.partner_id[0].id ? user.partner_id[0].id : '')}`,
    }
  }
  let u = null;
  try {
    let customer = await db.customer.findOne({
      where: { ips_code: object.ips_code, user_id: user_id }
    });
    if (!!customer) {
      if (!!!customer.syncId) {
        await customer.update({ syncId: object.syncId })
      }
      object.id = customer.customer;
      object.user_medical.user_id = customer.customer;
      u = await db.user.upsert(object);
      await db.user_medical.findOrCreate({
        where: { user_id: customer.customer }
      }).then(resp => {
        return db.user_medical.update(object.user_medical,
          {
            where: { user_id: customer.customer }
          })
      })
    } else {
      object.customer = {
        user_id: user_id,
        ips_code: object.ips_code
      }
      u = await db.user.create(object, {
        include: ['user_medical',
          // 'address',
          'customer']
      });
    }
    return Promise.resolve({ u })
  } catch (error) {
    return Promise.reject(error)
  }
}

module.exports = { syncPatientInfo }