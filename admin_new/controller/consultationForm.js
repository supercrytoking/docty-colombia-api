/* eslint-disable no-unused-vars */
const config = require('../../config/config.json');

const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { response, errorResponse } = require('../../commons/response');
const { cloneForm, addFormProperty, getForm, checkFormStatus } = require('../../commons/jotform');
const formUrl = config.jotform.formUrl;

async function updateClinicForm(form_id, clinicId) {
  let clinic = await db.user.findByPk(clinicId);
  if (clinic) {
    let status = false;
    // let formStatus = await checkFormStatus(form_id);
    // if (formStatus && formStatus.status)
    //   status = formStatus.status;
    await db.clinic_jotform.findOrCreate({ where: { clinic_id: clinicId, isActive: !!status } }).then(resp => resp[0].update({ form_id: form_id }));
    return addFormProperty(form_id, clinic.company_name);
  }
}

module.exports.create = async (req, res, next) => {
  let clinicId = req.body.clinic_id;
  let cf = await db.clinic_jotform.findOne({ where: { clinic_id: clinicId } });
  let form = null;
  if (!!cf && !!cf.form_id) {
    form = await getForm(cf.form_id);
  }
  if (!!form) {
    return res.send(form);
  }
  cloneForm()
    .then(resp => {
      updateClinicForm(resp.id, clinicId);
      return resp;
    })
    .then((r) => {
      res.send(r);
    }).catch(error => res.status(400).send({ status: false, error: `${error}` }));
};

module.exports.activateForm = async (req, res, next) => {
  try {
    let cfid = req.body.clinic_id;
    let cfi = null;
    let formStatus = null;
    if (!!cfid) {
      cfi = await db.clinic_jotform.findOne({ where: { clinic_id: cfid } });
    }
    if (!!cfi) {
      formStatus = await checkFormStatus(cfi.form_id);
    }
    if (!!formStatus && !!formStatus.status) {
      await cfi.update({ isActive: !!formStatus.status });
      return res.send({ status: true, data: cfi, formStatus: formStatus.data });
    }
    return res.status(400).send({ status: false, formStatus: formStatus.data });
  } catch (error) {
    res.status(400).send({ status: false, error: `${error}`, errors: error });
  }
};
module.exports.deactivateForm = async (req, res, next) => {
  try {
    let cfid = req.body.clinic_id;

    db.clinic_jotform.update({ isActive: false }, { where: { clinic_id: cfid } })
      .then(() => response(res, null, "Success"))
      .catch(err => errorResponse(res, err));

  } catch (error) {
    res.status(400).send({ status: false, error: `${error}` });
  }
};
module.exports.getAllCLinicForms = async (req, res, next) => {
  let query = req.query || {};
  let limit = query.limit || 50;
  let page = query.page || 1;
  let orderBy = query.orderBy || 'company_name';
  let order = query.order || 'ASC';
  let p = page - 1;
  if (p < 0) p = 0;
  let begin = p * limit;
  let search = query.search || '';
  let sql = `
  SELECT cf.id,cf.clinic_id, u.company_name,cf.form_id,cf.isActive, CONCAT('${formUrl}',cf.form_id) form 
  FROM clinic_jotforms cf,users u 
  WHERE cf.clinic_id = u.id AND u.company_name LIKE "%${search}%"
  ORDER BY ${orderBy} ${order}
  LIMIT ${begin},${limit}
  `;
  db.sequelize.query(sql).spread(resp => response(res, resp, '', 50)).catch(e => errorResponse(res, e));
};
module.exports.getClinicForms = async (req, res, next) => {
  let sql = `
  SELECT cj.form_id,cj.clinic_id,cj.isActive, CONCAT('${formUrl}',cj.form_id) form 
  FROM clinic_jotforms cj 
  WHERE cj.clinic_id =${req.params.clinicId}
  `;
  db.sequelize.query(sql)
    .spread(resp => response(res, resp[0]))
    .catch(e => errorResponse(res, e));
};

module.exports.submissions = async (req, res, next) => {
  let query = req.query || {};
  let orderKey = query.orderBy || 'createdAt';
  let order = query.order || 'DESC';
  let search = query.search || '';
  let formId = !!req.params && !!req.params.formId ? req.params.formId : null;
  let limit = query.limit || 50;
  let start = 0;
  let page = query.page || 1;
  page = page - 1;
  if (page < 0) page = 0;
  start = page * limit;

  let sql = `
      SELECT j.id,cj.form_id,j.submissionID,j.createdAt, ud.document_path,j.consultationId
      FROM clinic_jotforms cj, jotforms j, user_documents ud 
      WHERE cj.form_id = j.formId AND j.submissionID = ud.document_serial `;
  if (!!formId)
    sql += ` AND cj.form_id = ${formId} `;
  sql += ` AND (form_id LIKE '%${search}%' OR submissionID LIKE '%${search}%' OR consultationId LIKE '%${search}%')
      ORDER BY ${orderKey} ${order}
    `;
  db.queryRun(sql).then(r => response(res, r)).catch(e => errorResponse(res, e));
};