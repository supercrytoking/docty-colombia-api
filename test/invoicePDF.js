const db = require("../models");

const fs = require('fs');
const request = require('request');
var IMG_DIR = './public/icons';
const PDFDocument = require('pdfkit');
const { timeFormat, dateFormat } = require('../commons/helper')
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
function unSlug(text) {
    if (!!!text) text = "";
    return text.replace(/_/g, ' ');
}

const getTrnslations = async (lang, arr) => {
    return db.translation.findAll({
        attributes: ['keyword', 'section', lang],
        where: { section: { [Op.in]: arr } }
    }).then(res => {
        let Obj = {}
        if (res && res.length) {
            res.forEach(res => {
                Obj[res.section] = Obj[res.section] || {}
                Obj[res.section][res.keyword] = res[lang]
            })
        }
        return Obj;
    })
}

const getTranslation = (translations, section, keyword) => {
    try {
        let key = (keyword || '').toUpperCase();
        return translations[section][key] || keyword;
    } catch (error) {
        return unSlug(keyword)
    }
}

var create = async () => {
    let lang = 'es'
    let translation = await getTrnslations(lang, ['MEDICATION', 'MEDICINES', 'GENDER', 'MY_HISTORY', 'CLINIC', 'INVOICES', 'DOCTOR_PROFILE']);

    let attr = ['title', 'id'];
    if (lang == 'es') {
        attr = [['title_es', 'title'], 'id']
    }
    var invoice = await db.invoice.findOne({
        where: { id: 1 },
        include: [{
            model: db.booking,
            as: 'booking',
            attributes: ['id', 'councelling_type', 'reference_id'],
            include: [
                {
                    model: db.speciality,
                    as: 'speciality',
                    attributes: attr,
                    include: [
                        {
                            model: db.department,
                            as: 'department',
                            attributes: attr,
                        }
                    ]
                }
            ]
        },
        {
            model: db.user,
            as: 'from',
            include: ['address']
        }, {
            model: db.user,
            as: 'to',
            include: ['address']
        }]
    });

    invoice = JSON.parse(JSON.stringify(invoice));
    if (typeof invoice.details != 'object') invoice.details = JSON.parse(invoice.details)
    console.log(invoice)


    invoice = JSON.parse(JSON.stringify(invoice));
    if (invoice.from == null) {
        invoice.from = await db.user.findOne({ where: { id: invoice.from_id }, include: ['address'] })
    }
    if (invoice.to == null) {
        invoice.to = await db.user.findOne({ where: { id: invoice.to_id }, include: ['address'] })
    }
    if (invoice.booking == null) {
        invoice.booking = await db.user.booking({ where: { id: invoice.booking_id } })
    }

    // console.log(invoice)
    var TOP = 50;
    var WIDTH = 620;
    var PDF_HEIGHT = 600;
    const doc = new PDFDocument(
        { margins: { to: 20, left: 10, right: 10, bottom: 20 }, autoFirstPage: true, size: [WIDTH, PDF_HEIGHT] }
    );
    doc.pipe(fs.createWriteStream('./output.pdf')); // for debug
    try {
        doc.image(`${IMG_DIR}/logo.png`, 40, 50, {
            fit: [166 / 1.5, 61 / 1.5]
        });
    } catch (e) { console.log(e) }

    var title = `${getTranslation(translation, 'INVOICES', 'INVOICE_HEADING')}`;
    if(invoice.status)title = `${title} (${getTranslation(translation, 'INVOICES', invoice.status)})`;
    doc.fontSize(16).fillColor('#272b41').text(title, WIDTH / 2 - doc.widthOfString(title) / 2, TOP - 20);

    doc.fontSize(10).fillColor('#272b41').text(`${getTranslation(translation, 'MEDICATION', 'COUNSELLING_ID')}:`, WIDTH - 100 - doc.widthOfString(`${getTranslation(translation, 'MEDICATION', 'COUNSELLING_ID')}:`), TOP)
    doc.fontSize(10).fillColor('#757575').text(`#${invoice.booking.reference_id || ''}`, WIDTH - 95, TOP)

    doc.fontSize(10).fillColor('#272b41').text(`${getTranslation(translation, 'MEDICATION', 'INVOICE_ID')}:`, WIDTH - 100 - doc.widthOfString(`${getTranslation(translation, 'MEDICATION', 'INVOICE_ID')}:`), TOP + 17)
    doc.fontSize(10).fillColor('#757575').text(`#${invoice.id}`, WIDTH - 95, TOP + 17)

    doc.fontSize(10).fillColor('#272b41').text(`${getTranslation(translation, 'MEDICATION', 'INVOICE_DATE')}:`, WIDTH - 100 - doc.widthOfString(`${getTranslation(translation, 'MEDICATION', 'INVOICE_DATE')}:`), TOP + 17 * 2)
    doc.fontSize(10).fillColor('#757575').text(`${dateFormat(invoice.createdAt)}`, WIDTH - 95, TOP + 17 * 2)

    doc.fontSize(10).fillColor('#272b41').text(`${getTranslation(translation, 'MEDICATION', 'COUNSELLING_STATUS')}:`, WIDTH - 100 - doc.widthOfString(`${getTranslation(translation, 'MEDICATION', 'COUNSELLING_STATUS')}:`), TOP + 17 * 3);
    if (invoice.booking && invoice.booking.status) {
        var status = invoice.booking.status;
        status = status.charAt(0).toUpperCase() + status.slice(1);
        doc.fontSize(10).fillColor('#757575').text(`${status}`, WIDTH - 95, TOP + 17 * 3)
    }

    doc.fontSize(12).fillColor('#272b41').text(getTranslation(translation, 'MEDICATION', 'INVOICE_FROM'), WIDTH - 20 - doc.widthOfString(getTranslation(translation, 'MEDICATION', 'INVOICE_FROM')), TOP + 100);
    if (invoice.from) {
        doc.fontSize(12).fillColor('#757575').text(`${getTranslation(translation, 'MY_HISTORY', 'DR')} ${invoice.from.fullName}`, WIDTH - 20 - doc.widthOfString(`${getTranslation(translation, 'MY_HISTORY', 'DR')} ${invoice.from.fullName}`), TOP + 120);
        doc.fontSize(10).fillColor('#757575').text(`${invoice.from.id_proof_type || ''}: ${invoice.from.national_id}`, WIDTH - 20 - doc.widthOfString(`${invoice.from.id_proof_type || ''}: ${invoice.from.national_id}`), TOP + 137);
    }

    if (invoice.from && invoice.from.address)
        doc.fontSize(10).fillColor('#757575').text(`${invoice.from.address.address}`, WIDTH - 20 - doc.widthOfString(`${invoice.from.address.address}`), TOP + 150, { width: WIDTH / 2 - 20 });

    doc.fontSize(12).fillColor('#272b41').text(getTranslation(translation, 'MEDICATION', 'INVOICE_TO'), 10, TOP + 100);
    if (invoice.to) {
        doc.fontSize(12).fillColor('#757575').text(`${invoice.to.fullName}`, 10, TOP + 120);
        doc.fontSize(10).fillColor('#757575').text(`#${invoice.to.national_id || ''}`, 10, TOP + 132);
    }
    // if (invoice.to && invoice.to.address)
    //     doc.fontSize(10).fillColor('#757575').text(`${invoice.to.address.address} `, 10, TOP + 132, { width: WIDTH / 2 - 20 });

    doc.fontSize(12).fillColor('#272b41').text(getTranslation(translation, 'INVOICES', 'INVOICE_DESCRIPTOPN'), 10, TOP + 160);
    if (invoice.booking && invoice.booking.speciality && invoice.booking.speciality.department && invoice.booking.speciality.department.title) {
        doc.fontSize(10).fillColor('#272b41').text(`${getTranslation(translation, 'CLINIC', 'DEPARTMENT')}: `, 10, TOP + 176);
        doc.fontSize(10).fillColor('#757575').text(`${invoice.booking.speciality.department.title}`, 10 + doc.widthOfString(`${getTranslation(translation, 'CLINIC', 'DEPARTMENT')}: `), TOP + 176)
    }
    if (invoice.booking && invoice.booking.speciality && invoice.booking.speciality.title) {
        doc.fontSize(10).fillColor('#272b41').text(`${getTranslation(translation, 'CLINIC', 'SPECIALITY')}: `, 10, TOP + 190);
        doc.fontSize(10).fillColor('#757575').text(`${invoice.booking.speciality.title}`, 10 + doc.widthOfString(`${getTranslation(translation, 'CLINIC', 'SPECIALITY')}: `), TOP + 190)
    }

    doc.fontSize(12).fillColor('#272b41').text(getTranslation(translation, 'MEDICATION', 'PAYMENT_MODE'), 10, TOP + 220);
    doc.fontSize(12).fillColor('#757575').text(`${invoice.payment_mod}`, 10, TOP + 240);



    doc.fillColor('#757575')
        .moveTo(WIDTH - 30, TOP + 250)
        .lineTo(WIDTH - 240, TOP + 250)
        .stroke('#757575')

    doc.fontSize(12).fillColor('#272b41').text(`${getTranslation(translation, 'DOCTOR_PROFILE', 'FEES')}:`, WIDTH - 200, TOP + 259);
    if (invoice.details) doc.fontSize(12).fillColor('#757575').text(`$${invoice.details.provider_amount + invoice.details.provider_insured_cover}`, WIDTH - 100, TOP + 259);

    doc.fillColor('#757575')
        .moveTo(WIDTH - 30, TOP + 280)
        .lineTo(WIDTH - 240, TOP + 280)
        .stroke('#757575')

    doc.fontSize(12).fillColor('#272b41').text(`${getTranslation(translation, 'CLINIC', 'INSURED_COVER')}:`, WIDTH - 200, TOP + 290);
    if (invoice.details) doc.fontSize(12).fillColor('#757575').text(`-$${invoice.details.provider_insured_cover}`, WIDTH - 100, TOP + 290);

    doc.fillColor('#757575')
        .moveTo(WIDTH - 30, TOP + 310)
        .lineTo(WIDTH - 240, TOP + 310)
        .stroke('#757575')

    doc.fontSize(12).fillColor('#272b41').text(`${getTranslation(translation, 'MEDICATION', 'DISCOUNTS')}:`, WIDTH - 200, TOP + 320);
    doc.fontSize(12).fillColor('#757575').text(`-$${invoice.discount}`, WIDTH - 100, TOP + 320);

    doc.fillColor('#757575')
        .moveTo(WIDTH - 30, TOP + 340)
        .lineTo(WIDTH - 240, TOP + 340)
        .stroke('#757575')

    doc.fontSize(12).fillColor('#272b41').text(`${getTranslation(translation, 'MEDICATION', 'TOTAL')}:`, WIDTH - 200, TOP + 350);
    doc.fontSize(12).fillColor('#757575').text(`$${invoice.amount} `, WIDTH - 100, TOP + 350);

    doc.fillColor('#757575')
        .moveTo(WIDTH - 30, TOP + 370)
        .lineTo(WIDTH - 240, TOP + 370)
        .stroke('#757575')




    doc.save()
    doc.end()
    // process.exit()
}
create()