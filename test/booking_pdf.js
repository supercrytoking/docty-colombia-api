var fs = require('fs');

const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
var tmp = require('tmp');
var IMG_DIR = './public/icons';
var btoa = require('btoa')
// var atob = require('atob');
const PDFDocument = require('pdfkit');
const request = require('request');

const { dateFormat, unSlug, getTranslations, getTranslation } = require('../commons/helper');
const { createPDF } = require('../commons/pdfUtil.booking');
var async = require('async')
var mian = async () => {
    // var bblist = await db.booking.findAll({
    //     // where: { provider_id: 261 },
    //     include: [{
    //         model: db.prescription,
    //         as: 'prescription',
    //         required: true,
    //         where: { id: 284 }
    //     }]
    // });

    // for (var i = 0; i < bblist.length; i++) {

    //     var b = bblist[i];
    //     //     if (b.id == 14) continue
    //     // if (b.prescription && b.prescription.medications) {
    //     //     b.prescription.medications = JSON.parse(b.prescription.medications)
    //     //     console.log(b.id, b.prescription.medications.length)
    //     // }
    //     console.log('id', b.id)
    //     //     try {
    //     //         // var doc = await createPDF(b.id, 'en', `test/test/output_${b.id}.pdf`);
    //     //     } catch (e) {
    //     //         console.error(e)
    //     //     }
    // }

    var doc = await createPDF(2698, 'en', `d:/output_${2698}.pdf`);//2422
    process.exit();
};

mian();