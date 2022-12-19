const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

const config = require(__dirname + '/../config/config.json');

const { addActivityLog } = require('./activityLog');
const { crmTrigger } = require('../commons/crmTrigger');
const { errorResponse, response } = require('../commons/response');
const { S3UploadBase64, findSuccessManager } = require('../commons/helper');

/*====signedContract API============*/

function signedContracts(req, res, next) {
    if (req.user && req.user.id) {
        db.signedContract.findAll({}).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            })
        })

    }
    else {
        res.sendStatus(406)
    }
}

async function getSignedContractByUser(req, res, next) {
    if (req.user && req.user.id) {
        let id = req.user.id;
        if (req.query && req.query.user_id) {
            id = req.query.user_id
            if (req.user.id != parseInt(id)) {
                let user = await db.associate.findOne({ where: { user_id: req.user.id, associate: id } });
                if (!!!user) {
                    return errorResponse(res, 'SERVER_MESSAGE.SOMETING_WRONG');
                }
            }
        }
        db.signedContract.findOne({ where: { user_id: id, status: 1, end: { [Op.eq]: null } } }).then(resp => {
            res.send(resp);
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            })
        })

    }
    else {
        res.sendStatus(406);
    }
}

async function getSignedContractHistoryByUser(req, res, next) {
    if (req.user && req.user.id) {
        let id = req.user.id;
        if (req.query && req.query.user_id) {
            id = req.query.user_id;
            if (req.user.id !== parseInt(id)) {
                let user = await db.associate.findOne({ where: { user_id: req.user.id, associate: id } });
                if (!!!user) {
                    return errorResponse(res, 'SERVER_MESSAGE.SOMETING_WRONG');
                }
            }
        }
        db.signedContract.findAll({ where: { user_id: id }, order: [['createdAt', 'DESC']], include: ['user_profile_log'] }).then(resp => {
            res.send(resp);
        }).catch(err => {
            console.log(err)
            res.status(400).send({
                status: false,
                errors: err
            });
        });

    }
    else {
        res.sendStatus(406)
    }
}

async function addSignedContract(req, res, next) {
    let data = req.body;
    if (req.user && req.user.id) {
        data['user_id'] = req.user.id;
        try {
            let resp = await db.signedContract.findOrCreate({ where: { user_id: data.user_id } });
            await resp[0].update(data);
            if (req.user.role == 13) {
                await db.user.update({ status: 1 }, { where: { id: data.user_id } })
            }
            res.send({
                status: true,
                data: resp[0]
            })
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            })
        }
    } else {
        res.sendStatus(406)
    }
}


async function asignReviewer(req) {
    try {
        let user = req.user;
        let userRole;
        if (user && user.role != 2) {
            switch (user.role) {
                case '1':
                  userRole = 'Doctor'
                    break;
                case '13':
                  userRole = 'Corporates'
                    break;
                case '3':
                  userRole = 'Nurse'
                    break;
                case '4':
                  userRole = 'Laboratory'
                    break;
                case '5' :
                  userRole = 'Clinic'
                    break;
                case '6':
                  userRole = 'Pharamcy'
                    break;
                default:
            }
            let rev = await db.user_profile_reviewer.findOne({ where: { user_id: user.id } });
            if (!!rev) return;
            var admin = await findSuccessManager();
            if (admin && admin.id) {
                await db.user_profile_reviewer.create({ user_id: user.id, admin_id: admin.id });
                crmTrigger('Reviewer_Assigned', { email: user.email, reviewer: admin.fullName, userName: user.fullName,user: user.fullName, user_type: userRole }, req.lang || 'en')
                crmTrigger('New_Lead_Assigned', { email: admin.email, user: user.fullName, userName: admin.fullName, user_type: userRole }, admin.lang || req.lang || 'en');
            }
            return;
        }
    } catch (e) {
        console.log(e);
    }
}

async function sendEmailSignedContract(req, res, next) {
    if (req.user == null || req.user.id == null) return res.sendStatus(406);
    try {
        var json = req.user;
        json.pdfLink = req.body.pdfURL;

        asignReviewer(req);

        var signedContract = {};
        signedContract.contractPDF = json.pdfLink;
        signedContract.user_id = req.user.id;
        signedContract.signedDateAndTime = new Date();
        signedContract.status = 1;
        signedContract.version = req.body.version;

        try {
            var respSignature = await S3UploadBase64(req.body.signature);
            signedContract.signature = respSignature.Location;
        } catch (e) { }

        try {
            await db.signedContract.update({ status: 0 }, { where: { user_id: req.user.id } });
            var resp = db.signedContract.create(signedContract);
            await db.user.update({ isSigned: true }, { where: { id: req.user.id } });
        } catch (e) { }
        addActivityLog({ user_id: req.user.id, type: 'service aggriment' });
        var user = await db.user.findOne({ where: { id: req.user.id }, include: ['associatedTo', 'user_role'] });
        if (user.user_role && user.user_role && user.user_role.role_id == 13 && user.status == 0 || user.status == null) {
            await db.user.update({ status: 1 }, { where: { id: req.user.id } })
        }

        crmTrigger('You_Signed_Contract', { email: req.user.email, pdfLink: json.pdfLink, userName: user.fullName }, req.lang);

        res.send({
            status: true,
            data: resp
        });

        try {
            // check user is staff of company

            user = JSON.parse(JSON.stringify(user));
            if (user && user.associatedTo && user.associatedTo.user && user.user_role && (user.user_role.role_id == 1 || user.user_role.role_id == 3)) {
                var company = user.associatedTo.user;
                crmTrigger('Staff_Signed_Contract', {
                    email: company.email, company: company.company_name,
                    staff_name: `${user.fullName}`, staff_email: user.email, staff_photo: user.picture, staff_contact_pdf_link: json.pdfLink,
                    staff_profile_link: `${config.domains.clinic}/my-staff/view/${user.id}`
                }, req.lang);
            }
        } catch (e) { console.log(e) }
    } catch (error) {
        console.log(error)
        res.status(400).send({
            status: false,
            data: error
        });
    }
}

module.exports = { signedContracts, getSignedContractByUser, getSignedContractHistoryByUser, addSignedContract, sendEmailSignedContract }
