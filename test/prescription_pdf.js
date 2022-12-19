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
const { createPDF } = require('../commons/pdfUtil');
var async = require('async')
var mian = async () => {
    var ppList = await db.prescription.findAll({
        where: {
            // reference_id: { [Op.eq]: '17648C819BA' }
            id: 259
        }, include: ['note']
    });

    // for (var i = 7; i < ppList.length; i++) {
    //     var d = new Date().getTime()
    //     try {

    //         console.log('trying ', i)
    //         var doc = await createPDF(ppList[i], {})
    //         if (doc != null)
    //             doc.pipe(fs.createWriteStream(`d://prescriptin${i}.pdf`)).on('close', (r) => { }) //debugging
    //     } catch (e) {
    //         console.log('error in ', i)
    //     }
    //     console.log('finished', i, new Date().getTime() - d)
    // }

    // var d = new Date().getTime()
    var test = 0;
    var doc = await createPDF(ppList[test], {}, false)
    doc.pipe(fs.createWriteStream(`d://prescriptin${test}.pdf`)).on('close', (r) => {
        process.exit()
    }) //debugging

    // console.log('finished', test, new Date().getTime() - d)

};

mian();