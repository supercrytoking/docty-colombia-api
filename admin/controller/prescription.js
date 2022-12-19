const Sequelize = require('sequelize');
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const { capitalize } = require('../../commons/helper');
const pdfUtil = require('../../commons/pdfUtil');
const Op = Sequelize.Op;

/*====Prescription API============*/

async function prescriptions(req, res, next) {
    if (req.user && req.user.id) {
        let page = 1;
        let orderKey = 'createdAt';
        let order = 'DESC';
        let search = '';
        if (req.query && req.query.page) {
            page = req.query.page;
        }
        if (req.body && req.body.page) {
            page = req.body.page;
        }
        if (req.body && req.body.search) {
            search = req.body.search;
        }
        if (req.body && req.body.orderKey) {
            orderKey = req.body.orderKey;
        }
        if (req.body && req.body.order) {
            order = req.body.order;
        }

        let sq1 = `SELECT COUNT(id) AS rowCount FROM prescriptions`;
        let count = await db.sequelize.query(sq1).spread(e => e[0]);
        // count = JSON.parse(JSON.stringify(count));

        let sql = `SELECT  p.*, CONCAT(pa.first_name,' ', pa.last_name) patient, CONCAT(d.first_name,' ', d.last_name) doctor, f.company_name pharmacy, b.status booking_status
        FROM prescriptions p
        LEFT JOIN bookings b ON p.reference_id = b. reference_id
        LEFT JOIN users pa ON b.patient_id = pa.id
        LEFT JOIN users d ON b.provider_id = d.id
        LEFT JOIN users f ON b.pharmacy = f.id
        WHERE  
        p.reference_id LIKE '%${search}%' OR pa.first_name LIKE '%${search}%' OR pa.last_name LIKE '%${search}%' OR d.last_name LIKE '%${search}%' OR d.first_name LIKE '%${search}%' 
        ORDER BY ${orderKey} ${order} LIMIT ${getLimitOffset(page).join(',')}`;
        db.sequelize.query(sql).spread(resp => response(res, { rows: resp, count: count.rowCount })).catch(err => errorResponse(res, err));
    }
    else {
        res.sendStatus(406);
    }
}

function deletePrescription(req, res, next) {
    if (req.user && req.user.id) {
        db.prescription.destroy({ where: { id: req.body.id } }).then(resp => {
            res.send({
                status: true,
                message: 'deleted successfuly'
            });
        }).catch(err => {
            console.log(err);
            res.status(400).send({
                status: false,
                errors: err
            });
        });

    }
    else {
        res.sendStatus(406);
    }
}

function prescriptionByReference(req, res, next) {
    if (req.user && req.user.id) {
        console.log(req.body.reference_id);
        db.prescription.findOne({ where: { reference_id: req.body.reference_id } }).then(resp => {
            res.send(resp);
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            });
        });

    }
    else {
        res.sendStatus(406);
    }
}

function prescriptionNotesByReference(req, res, next) {
    if (req.user && req.user.id) {
        console.log(req.body.reference_id);
        db.prescription_note.findOne({ where: { reference_id: req.body.reference_id } }).then(resp => {
            res.send(resp);
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            });
        });

    }
    else {
        res.sendStatus(406);
    }
}


async function updatePrescription(req, res, next) {
    let data = req.body;

    if (req.user && req.user.id) {
        data['user_id'] = req.user.id;
        try {
            let resp = await db.prescription.upsert(data);
            res.send({
                status: true,
                data: resp
            });
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            });
        }
    } else {
        res.sendStatus(406);
    }
}

async function downloadCSV(req, res, next) {
    var query = req.query;

    var where = {};
    if (query.from) {
        where['createdAt'] = { [Op.gte]: (new Date(query.from)) };
    }
    if (query.to) {
        where['createdAt'] = { [Op.lte]: (new Date(query.to)) };
    }

    if (query.from && query.to) {
        where['createdAt'] = { [Op.and]: [{ [Op.gte]: (new Date(query.from)) }, { [Op.lte]: (new Date(query.to)) }] };
    }

    var attributes = [];
    if (query.includes) {
        attributes = query.includes.split(',');
    }

    db.prescription.findAll({ where: where, include: [{ model: db.booking, as: 'booking', include: ['patientInfo', 'providerInfo', 'schedule'] }] }).then(resp => {
        var book_list = JSON.parse(JSON.stringify(resp));
        res.setHeader('Content-disposition', 'attachment; filename=prescription_list.csv');
        res.setHeader('Content-type', 'text/csv');
        res.charset = 'UTF-8';

        var csv = 'Prescribed By,Patient,Date,Status,Payment\n';
        if (attributes && attributes.length > 0) {
            csv = attributes.map(item => capitalize(item)).join(',') + '\n';
        }
        for (var i = 0; i < book_list.length; i++) {
            var prescription = book_list[i];
            if (prescription.booking == null) continue;
            if (prescription.booking.patientInfo == null) continue;
            if (prescription.booking.providerInfo == null) continue;
            prescription.patient = prescription.booking.patientInfo.fullName;
            prescription.doctor = prescription.booking.providerInfo.fullName;
            prescription.reference_id = prescription.booking.reference_id;
            prescription.status = prescription.booking.status;


            if (attributes && attributes.length > 0) {
                csv += attributes.map(includeColumn => prescription[includeColumn] || '').join(',') + '\n';
            } else {
                csv += `${prescription.booking.providerInfo.first_name},${prescription.booking.patientInfo.first_name},${prescription.createdAt},${prescription.booking.status},${prescription.booking.payment_status}\n`;
            }

        }

        res.write(csv);
        res.end();
    }).catch(err => {
        res.status(400).send({
            status: false,
            errors: `${err}`
        });
    });
}
var downloadPDF = async (req, res, next) => {
    if (req.user && req.user.id && req.query && req.query.id) {
        try {
            var id = req.query.id;

            let data = await db.prescription.findOne({ where: { id: id }, include: ['note'] });

            if (typeof data.medications == 'string') data.medications = JSON.parse(data.medications);
            var r = await pdfUtil.createPDF(data, req, false);

            // res.redirect(r.Location);
            r.pipe(res);
            // res.send(r);
        } catch (error) {
            console.log(error);
            res.status(400).send({
                status: false,
                errors: `${error}`
            });
        }
    } else {
        res.sendStatus(406);
    }
};

module.exports = { prescriptions, prescriptionByReference, prescriptionNotesByReference, updatePrescription, deletePrescription, downloadCSV, downloadPDF };
