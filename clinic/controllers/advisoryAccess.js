const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require("../../commons/paginator");
const {
  response,
  errorResponse,
  responseObject,
} = require("../../commons/response");
const { otpTrigger, crmTrigger } = require("../../commons/crmTrigger");

async function requestAdvisory(data) {
  return db.health_advisor
    .findOrCreate({
      where: { patient_id: data.patient_id, clinic_id: data.clinic_id },
      paranoid: false,
    })
    .then((resp) => {
      return resp[0].update(data).then((r) => resp[0]);
    });
}
module.exports = {
  advisoyRequest: async (req, res) => {
    if (req.user && req.user.id) {
      let data = req.body;
      data.clinic_id = req.user.id;
      // data.deletedAt = null;
      data.family_access = null;
      data.approved = null;
      let user = await db.user.findOne({
        where: { email: data.email, email_verified: 1 },
      });
      if (data.tnc) {
        requestAdvisory(data)
          .then(async (resp) => {
            await crmTrigger(
              "Patient_Health_Advisory_Request",
              {
                userName: user.fullName,
                email: data.email,
                remark: data.request_remark,
                clinicName: req.user.company_name,
                link: "",
              },
              user.lang || req.lang || "es"
            );
            return response(res, resp);
          })
          .catch((e) => errorResponse(res, e));
      } else {
        return errorResponse(res, {}, "Please accept T&C");
      }
    } else {
      res.sendStatus(406);
    }
  },
  requestAdvisory,
};
