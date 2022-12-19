const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require("../../commons/paginator");
const { response, errorResponse } = require("../../commons/response");
const { crmTrigger } = require("../../commons/crmTrigger");

module.exports = {
  getAdvisors: async (req, res, next) => {
    let sql = `SELECT ha.family_access,ha.approved,ha.id,ha.clinic_id,ha.patient_id,ha.updatedAt,ha.deletedAt,ha.isDefault,
      ha.request_remark,ha.reject_remark,u.company_name,u.picture,c.ips_code,u.thumbnail,
      oc.full_name support_person,CONCAT(u.isd_code,oc.phone) support_phone
      FROM health_advisors ha
      JOIN users u ON u.id = ha.clinic_id
      LEFT JOIN customers c ON ha.patient_id = c.customer AND ha.clinic_id = c.user_id
      LEFT JOIN org_contacts oc ON oc.user_id = ha.clinic_id AND oc.type = "support"
      WHERE ha.clinic_id = u.id AND ha.patient_id =  ${req.user.id}`;

    db.sequelize
      .query(sql)
      .spread((r) => {
        let obj = {
          active: [],
          removed: [],
          pending: [],
        };
        for (let item of r) {
          if (!!item.approved) {
            if (item.deletedAt) {
              obj.removed.push(item);
            } else {
              obj.active.push(item);
            }
          } else {
            obj.pending.push(item);
          }
        }
        return response(res, obj);
      })
      .catch((err) => errorResponse(res, err));
  },
  removeAdvisor: async (req, res, next) => {
    db.health_advisor
      .destroy({
        where: { patient_id: req.user.id, clinic_id: req.body.clinic_id },
      })
      .then(async (r) => {
        await db.customer.destroy({
          where: {
            user_id: req.body.clinic_id,
            customer: req.user.id,
          },
        });

        var clinic = await db.user.findByPk(req.body.clinic_id);
        var patient = await db.user.findByPk(req.user.id);

        crmTrigger(
          "Patient_Health_Advisory_Reject",
          {
            email: clinic.email,
            company_name: clinic.company_name,
            remarks: req.body.request_remark || "",
            patient_name: patient.fullName,
          },
          clinic.lang || req.lang || "en"
        );
        return module.exports.getAdvisors(req, res, next);
      })
      .catch((err) => errorResponse(res, err));
  },
  toggleAccess: async (req, res, next) => {
    let data = req.body || {};
    let update = {};
    if (data.hasOwnProperty("isDefault")) {
      update.isDefault = data.isDefault;
      await db.health_advisor.update({ isDefault: false }, { where: { patient_id: req.user.id } })
    }
    if (data.hasOwnProperty("family_access")) {
      update.family_access = data.family_access
      await db.customer
        .update(
          {
            family_access: data.family_access,
          },
          {
            where: { customer: req.user.id, user_id: data.clinic_id },
          }
        );
    }
    db.health_advisor.update(
      update,
      {
        where: { patient_id: req.user.id, clinic_id: data.clinic_id },
      }
    ).then((r) => response(res, r[0] == 1))
      .catch((err) => errorResponse(res, err));
  },

  approveAdvisor: async (req, res, next) => {
    if (!!!req.body.approved || req.body.approved == 0) {
      return db.health_advisor.destroy({
        where: {
          clinic_id: req.body.clinic_id,
          patient_id: req.user.id,
          approved: null
        },
        paranoid: false,
        force: true
      }).then(() => module.exports.getAdvisors(req, res, next));
    }
    db.sequelize
      .query(
        `UPDATE health_advisors SET approved = ${req.body.approved}, deletedAt = NULL WHERE patient_id = ${req.user.id} AND clinic_id = ${req.body.clinic_id}`
      )
      .then(async (r) => {
        if (!!req.body.approved) {
          await db.customer.findOrCreate({
            where: {
              user_id: req.body.clinic_id,
              customer: req.user.id,
            },
          });
        }

        var clinic = await db.user.findByPk(req.body.clinic_id);
        var patient = await db.user.findByPk(req.user.id);
        crmTrigger(
          "Transfer_completed_patient",
          {
            email: patient.email,
            subject: "Docty Health Care: Transfer Complete",
            clinic: clinic.company_name,
            remarks: req.body.request_remark || "",
          },
          patient.lang || req.lang || "en"
        );
        crmTrigger(
          "Transfer_patient_completed_clinic",
          {
            email: clinic.email,
            subject: "Docty Health Care: Transfer Complete",
            patient: patient.email,
            remarks: req.body.request_remark || "",
          },
          clinic.lang || req.lang || "en"
        );

        return module.exports.getAdvisors(req, res, next);
      })
      .catch((err) => {
        errorResponse(res, err);
        console.log(err);
      });
  },
  // advisorRequests: async (req, res) => {
  //   db.health_advisor.findAll({
  //     where: { patient_id: req.user.id, approved: 1 },
  //     include: [
  //       {
  //         model: db.user.scope('publicCompanyInfo'),
  //         as: 'health_advisors'
  //       }
  //     ]
  //   }).then(resp => response(res, resp[0])).catch(err => errorResponse(res, err))
  // }
};
