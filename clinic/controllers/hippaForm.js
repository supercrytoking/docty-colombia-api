const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { otpTrigger, crmTrigger } = require('../../commons/crmTrigger');
const { generateToken, councelling_type, scheduleTimeFormat, getNewPassword, getUserDomain } = require('../../commons/helper');
const { errorResponse, response } = require('../../commons/response');
const config = require(__dirname + '/../../config/config.json');
const btoa = require('btoa');
const bcrypt = require('bcryptjs');
const formUrl = config.jotform.formUrl;

module.exports = {
  myConsultationForm: async (req, res, next) => {
    let sql = `SELECT cj.form_id,cj.clinic_id, cj.isActive, CONCAT('${formUrl}',cj.form_id) form 
    FROM clinic_jotforms cj WHERE cj.clinic_id = ${req.user.id}`;
    db.sequelize.query(sql).spread(resp => response(res, resp[0])).catch(ee => errorResponse(res, ee));
  },

  submissions: async (req, res, next) => {
    let query = req.query || {};
    let orderKey = query.orderKey || 'createdAt';
    let order = query.order || 'DESC';
    let search = query.search || '';
    let formId = req.params.formId;
    let userId = req.user.id;
    let limit = query.limit || 50;
    let start = 0;
    let page = query.page || 1;
    page = page - 1;
    if (page < 0) page = 0;
    start = page * limit;

    let sql = `
      SELECT j.id,cj.form_id formId,j.submissionID,j.createdAt, ud.document_path,j.consultationId,
      CONCAT(u1.first_name,' ', u1.last_name) patient,CONCAT(u2.first_name,' ', u2.last_name) doctor
      FROM clinic_jotforms cj
      JOIN jotforms j ON formId = j.formID
      LEFT JOIN user_documents ud ON j.submissionID = ud.document_serial
      LEFT JOIN users u1 ON u1.id = j.user_id
      LEFT JOIN users u2 ON u2.id = j.added_by
      WHERE formId = ${formId} AND cj.clinic_id = ${userId}
      AND (formId LIKE '%${search}%' OR submissionID LIKE '%${search}%' OR consultationId LIKE '%${search}%')
      ORDER BY ${orderKey} ${order}
    `;
    db.queryRun(sql).then(r => response(res, r)).catch(e => errorResponse(res, e));
  },
  excels: (req, res, next) => {

  }
};