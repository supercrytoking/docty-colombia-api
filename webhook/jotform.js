/* eslint-disable no-unused-vars */
const config = require('../config/config.json');
const formidable = require('formidable');

const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { getpdf } = require('./dropbox');
const { sendEmail } = require('../commons/helper');

module.exports = {
  jotform: (req, res, next) => {
    var form = new formidable.IncomingForm();
    // sendEmail('anurag_db@yopmail.com', 'Jotform webhook accessed', { html: "Jot form webhook accessed" });
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.log(err);
        return res.send({ status: false });
      }
      if (!!fields) {
        let data = fields.rawRequest;
        // sendEmail('anurag_db@yopmail.com', 'Jotform webhook data', { html: data });
        let consultationId = null;
        let patient_id = null;
        data = JSON.parse(data);
        if (typeof data == 'string') {
          data = JSON.parse(data);
        }
        for (let key in data) {
          if (key.indexOf('consultationId') >= 0) {
            consultationId = data[key];
          }
          if (key.includes('patient_id')) {
            patient_id = data[key];
          }
        }
        console.log(consultationId, patient_id, 37);
        // sendEmail('anurag_db@yopmail.com', 'Jotform webhook PatirntId', { html: JSON.stringify({ consultationId, patient_id }) });
        let obj = null;
        if (consultationId) {
          let book = await db.booking.findOne({ where: { reference_id: consultationId } });
          if (!!book) {
            obj = {
              user_id: book.patient_id,
              added_by: book.provider_id,
              data: data,
              formID: fields.formID,
              submissionID: fields.submissionID,
              consultationId: consultationId,
              type: 'consultation'
            };
          }
        } else if (!!patient_id) {
          obj = {
            user_id: patient_id,
            added_by: data.provider_id || null,
            data: data,
            formID: fields.formID,
            submissionID: fields.submissionID,
            // consultationId: consultationId,
            type: 'medical_certificate'
          }
        }
        sendEmail('anurag_db@yopmail.com', 'Jotform webhook Object', { html: JSON.stringify({ obj }) });
        if (!!obj) {
          await db.jotform.create(obj);
        }
      }
      res.send({ status: true, fields });
    });
    /** temp code */
    // res.send({ status: true });
  },
  medicalForm: async (req, res, next) => {
    var form = new formidable.IncomingForm();
    await sendEmail('anurag_db@yopmail.com', 'Jotform webhook accessed', { html: "Jot form webhook accessed" });
    form.parse(req, async (err, fields, files) => {
      if (err) {
        await sendEmail('anurag_db@yopmail.com', 'Jotform webhook accessed', { html: JSON.stringify(err) });
        return res.send({ status: false });
      }
      if (!!fields) {
        let data = fields.rawRequest;
        await sendEmail('anurag_db@yopmail.com', 'Jotform webhook data', { html: fields });
        data = JSON.parse(data);
        if (typeof data == 'string') {
          data = JSON.parse(data);
        }
        // for (let key in data) {
        //   if (key.indexOf('consultationId') >= 0) {
        //     consultationId = data[key];
        //   }
        // }
      }
      res.send({ status: true, fields });
    });
  }
};