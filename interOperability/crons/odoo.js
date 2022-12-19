const db = require("../../models")
const { otpTrigger } = require("../../commons/crmTrigger")
const { syncPatientInfo } = require("./odoo//patient");
const { syncDoctorInfo } = require("./odoo/doctor");
const { syncAppointmentInfo } = require('./odoo/appointment');


module.exports = {
  odooFetch: async () => {
    process.on('unhandledRejection', (reason, p) => {
      console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    });
    let job = await db.his_info.findOne({
      where: { status: 0 }
    }).catch(r => {
      return console.log(r)
    })
    if (!!job) {
      let LD = `${new Date()}`;
      await job.update({ status: 'running' }).catch(e => console.log(e));
      return Promise.all([
        syncPatientInfo(job),
        syncDoctorInfo(job)
      ]).then(() => Promise.all([
        syncAppointmentInfo(job)
      ]))
        .then(async (r) => {
          await job.update({
            finishedAt: `${new Date()}`,
            status: 'complete',
            last_synced: LD, errors: null
          })
            .then(() => sendMail(job.user_id))
          // .then(() => process.exit())
          // .catch(e => process.exit());
          return;
        }).catch(r => {
          job.update({ finishedAt: `${new Date()}`, status: 'failed', errors: r })
          // return process.exit();
        });
    } else {
      // return process.exit()
    }
  }
}

async function sendMail(id) {
  let usr = await db.user.scope('').findByPk(id);
  if (!!usr) {
    return otpTrigger('his_sync_complete', { email: usr.email, hisName: 'Odoo', clinicName: usr.company_name }, (usr.lang || 'es'))
  }
  return Promise.resolve()
}
// module.exports.odooFetch();