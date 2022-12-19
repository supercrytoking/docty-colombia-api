var nodemailer = require('nodemailer');
const crypto = require('crypto');
const config = require(__dirname + '/../config/config.json');

var AWS = require('aws-sdk');
const client = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
var generator = require('generate-password');
const bcrypt = require('bcryptjs');
var fs = require('fs');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const btoa = require('btoa');

var awsCred = config.awsCred;
var awsBucket = config.awsBucket;
AWS.config.update(awsCred);


var S3 = require('aws-sdk/clients/s3');

var multer = require('multer');   //FOR FILE UPLOAD

var TEMP_STORAGE = `./public/temp`;

if (!fs.existsSync(TEMP_STORAGE)) fs.mkdirSync(TEMP_STORAGE);

var uploadTempStorage = multer({ //multer settings
    storage: multer.diskStorage({ //multers disk storage settings
        destination: function (req, file, cb) {
            cb(null, TEMP_STORAGE); //image storage path
        },
        filename: function (req, file, cb) {
            var datetimestamp = Date.now();
            cb(null, file.originalname);
        }
    })
}).single('file');

if (!fs.existsSync('./public/avatar')) fs.mkdirSync('./public/avatar');

var upload = multer({ //multer settings
    storage: multer.diskStorage({ //multers disk storage settings
        destination: function (req, file, cb) {
            cb(null, './public/avatar'); //image storage path
        },
        filename: function (req, file, cb) {
            var datetimestamp = Date.now();
            cb(null, file.originalname);
        }
    })
}).single('file');

var councelling_type = (type) => {
    switch (type) {
        case 'video_call': return 'Video Call';
        case 'home_care': return 'Home Care';
        case 'visit': return 'Visit';
    }
    return type;
};

var councelling_link = (book, user_type = 'patient') => {
    switch (book.type) {
        case 'video_call': return `${config.domains.doctor}/video-call/patient-screen/${book.reference_id}`;
        case 'home_care': return `${config.domains.nurse}/map/track/${book.reference_id}`;
        case 'visit': return `${config.domains.clinic}/map/track/${book.reference_id}`;
    }
    return `${config.basePath}/video-call/patient-screen/${book.reference_id}`;
};

var TWO_NUMBER = (n) => {
    return ('00' + n).slice(-2);
};

var TIME_ZONE_TRANSFORM = (date, timezoneOffset) => {
    if (date == null) return;
    if (timezoneOffset == null) return date;
    date.setMinutes(date.getMinutes() - (timezoneOffset - new Date().getTimezoneOffset()));
};

var timeFormat = (_time, timezoneOffset = null) => {
    var _date = new Date(_time);
    TIME_ZONE_TRANSFORM(_date, timezoneOffset);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    var month = _date.getMonth();
    var date = _date.getDate();
    var year = _date.getFullYear();

    return `${year} ${monthNames[month]} ${TWO_NUMBER(date)} ${TWO_NUMBER(_date.getHours())}:${TWO_NUMBER(_date.getMinutes())}:${TWO_NUMBER(_date.getSeconds())}`;
};

var generateToken = async (userInfo = {}) => {
    var current_date = (new Date()).valueOf().toString();
    var random = Math.random().toString();
    userInfo['random'] = random;
    userInfo['dated'] = new Date().toISOString();
    return await btoa(JSON.stringify(userInfo)).replace(/=/g, '')
    //crypto.createHash('sha1').update(current_date + random + username).digest('hex');
};

var userStatus = (user) => {
    user.statusString = '';
    if (user.status == -2) user.statusString = 'Closed';

    else if (user.status == -1) user.statusString = 'Suspended';

    else if (!user.isSigned) { user.statusString = 'Pending'; }
    else {
        if (user.status == 1) user.statusString = 'Verified';
        else user.statusString = 'Under Review';
    }
};

function unSlug(text) {
    if (!!!text) text = "";
    return text.replace(/_/g, ' ');
}

const getTranslations = async (lang, arr) => {
    return db.translation.findAll({
        attributes: ['keyword', 'section', lang],
        where: { section: { [Op.in]: arr } }
    }).then(res => {
        let Obj = {};
        if (res && res.length) {
            res.forEach(res => {
                Obj[res.section] = Obj[res.section] || {};
                Obj[res.section][res.keyword] = res[lang];
            });
        }
        return Obj;
    });
};

const getTranslation = (translations, section, keyword) => {
    try {
        let key = (keyword || '').toUpperCase();
        return translations[section][key] || keyword;
    } catch (error) {
        return unSlug(keyword);
    }
};

var _successManager = async (address_id = null, checkOnlyCountry = false) => {
    var include = ['user_profile_reviewer',
        {
            model: db.role,
            as: 'admin_role',
            required: true,
            include: [
                {
                    model: db.role_permission,
                    as: 'role_permissions',
                    required: true,
                    include: [{
                        required: true,
                        model: db.permission,
                        as: 'permission',
                        where: {
                            url: { [Op.like]: `%/profile-review%` }
                        }
                    }]
                }
            ]
        }
    ];
    var include_condition = [];
    if (address_id) {
        var address = await db.address.findByPk(address_id);
        console.log('address', address_id, JSON.parse(JSON.stringify(address)));
        // var longitude = address.longitude;
        // var latitude = address.latitude
        // var country = address.country;
        // if (longitude && latitude && country) {
        // var LIMIT_KM = 20 * 1.60934 // 20 Mile
        // include_condition.push({
        //     model: db.address,
        //     as: 'address',
        //     attributes: {
        //         include: [
        //             [
        //                 Sequelize.fn(
        //                     'ST_Distance',
        //                     Sequelize.fn('point', Sequelize.col("longitude"), Sequelize.col("latitude")),
        //                     Sequelize.fn('point', longitude, latitude)
        //                 ),
        //                 'distance'
        //             ]
        //         ]
        //     },
        //     where: {
        //         longitude: { [Op.ne]: null },
        //         latitude: { [Op.ne]: null },
        //         [Op.and]: [
        //             Sequelize.where(Sequelize.fn('ST_Distance',
        //                 Sequelize.fn('point', Sequelize.col("longitude"), Sequelize.col("latitude")),
        //                 Sequelize.fn('point', longitude, latitude)
        //             ), '<', LIMIT_KM / 100),
        //         ],
        //         country: country
        //     },

        // })
        // }
        var addressWhere = {};
        if (address.city) {
            addressWhere.city = address.city;
        }
        if (address.state) {
            addressWhere.state = address.state;
        }
        if (address.country) {

            addressWhere.country = address.country;

            if (checkOnlyCountry) addressWhere = { country: address.country };
        }

        include_condition.push({
            model: db.address,
            as: 'address',
            where: addressWhere
        });
    }

    var adminList = await db.admin.findAll({
        where: {
            status: true,
            isSuper: {
                [Op.or]: [{ [Op.eq]: false }, { [Op.eq]: null }]
            }
        },
        include: include.concat(include_condition)
    });
    var supperList = await db.admin.findAll({ where: { status: true, isSuper: true }, include: ['user_profile_reviewer'].concat(include_condition) });
    adminList = adminList.concat(supperList);

    adminList = adminList.sort((a, b) => {
        return (a.user_profile_reviewer || []).length - (b.user_profile_reviewer || []).length;
    });

    console.log('adminList', adminList.length);
    if (adminList && adminList.length > 0) {

        return JSON.parse(JSON.stringify(adminList[0]));
    }
    return null;
};

var findSuccessManager = async (address_id = null) => {
    var admin = await _successManager(address_id);
    if (admin == null) admin = await _successManager(address_id, true); // find success manager in their country
    if (admin == null) admin = await _successManager(); // ignore address 
    return admin;
};

function getAge(birthday) {
    if (!!!birthday) return null;
    birthday = new Date(birthday);
    var today = new Date();
    var thisYear = 0;
    if (today.getMonth() < birthday.getMonth()) {
        thisYear = 1;
    } else if ((today.getMonth() == birthday.getMonth()) && today.getDate() < birthday.getDate()) {
        thisYear = 1;
    }
    var age = today.getFullYear() - birthday.getFullYear() - thisYear;
    return age;
}

function formatAMPM(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
}

var dateFormat = (date) => {
    var date = new Date(date);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    var _month = date.getMonth();
    var _date = date.getDate();
    var _year = date.getFullYear();
    return `${TWO_NUMBER(_date)} ${monthNames[_month]} ${_year}`;
};

var scheduleTimeFormat = (schedule, timezoneOffset = null) => {
    if (schedule == null) return '';
    var start = new Date(schedule.start);
    var end = new Date(schedule.end);
    TIME_ZONE_TRANSFORM(start, timezoneOffset);
    TIME_ZONE_TRANSFORM(end, timezoneOffset);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    let s = new Date(start).toLocaleString('EN-US', {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    let e = new Date(end).toLocaleString('EN-US', {
        hour: "2-digit",
        minute: "2-digit",
    });
    return `${s}-${e}`;
};

async function getClinicOfUser(user, patient_insurance_id, param_type_code = null) {
    try {
        var user_id = user.id;
        var associateObj = await db.associate.findOne({
            where: {
                associate: user_id
            },
            include: [{ model: db.user, as: 'user', attributes: ['id', 'company_name', 'picture'], include: ['insurance_associates'] }]
        });
        associateObj = JSON.parse(JSON.stringify(associateObj));
        if (associateObj && associateObj.user) {
            user.associatedTo = { user: associateObj.user };
            var type_code = 'video_call';
            if (user.user_role && user.user_role.role_id == 3) type_code = 'home_care';
            if (param_type_code) type_code = param_type_code;

            if (user.services) {
                for (var i = 0; i < user.services.length; i++) {
                    var service = user.services[i];
                    service.price = 0;
                    console.log('d', service);
                    try {

                        let sql;
                        if (patient_insurance_id) {
                            // find matching insurance price
                            sql = `SELECT cs.id, MAX(cs.copay) price, insured_cover, cs.copay, cs.total, cs.id FROM company_services cs, user_specialities us, associates a WHERE cs.status = 1 AND cs.expertise_level = ${user.expertise_level || 0} AND cs.user_id = a.user_id AND a.associate = ${user_id} AND cs.user_speciality_id = us.id AND us.speciality_id = ${service.speciality_id} AND us.department_id = ${service.department_id} AND cs.type_code = "${type_code}"`;
                            sql += ` AND cs.insurance_provider_id = ${patient_insurance_id} `;
                            var queryResult = await db.queryRun(sql);
                            console.log(queryResult);

                            if (queryResult && queryResult[0] && queryResult[0].price) {
                                service.price = queryResult[0].price || 0;
                                if (queryResult[0].insured_cover) service.insured_cover = queryResult[0].insured_cover;
                                continue;
                            }
                        }

                        sql = `SELECT cs.id, MAX(cs.copay) price, insured_cover, cs.copay, cs.total, cs.id FROM company_services cs, user_specialities us, associates a WHERE cs.status = 1 AND cs.expertise_level = ${user.expertise_level || 0} AND cs.user_id = a.user_id AND a.associate = ${user_id} AND cs.user_speciality_id = us.id AND us.speciality_id = ${service.speciality_id} AND us.department_id = ${service.department_id} AND cs.type_code = "${type_code}"`;
                        sql += ` AND cs.insurance_provider_id is null`;

                        console.log(sql);
                        var queryResult = await db.queryRun(sql);
                        if (queryResult && queryResult[0] && queryResult[0].id) {
                            service.price = queryResult[0].price || 0;
                        }

                    } catch (error) {
                        console.log(error);
                    }
                }
            }
        }
    } catch (e) {
        console.log('error', e);
    }

}


async function calculateServicePrice(services, user_id) {
    try {
        var user = await db.user.findOne({
            where: {
                id: user_id
            },
            include: [{ model: db.user_role, as: 'user_role' }]
        });
        var associateObj = await db.associate.findOne({
            where: {
                associate: user_id
            },
            include: [{ model: db.user, as: 'user', attributes: ['id', 'company_name', 'picture'], include: ['insurance_associates'] }]
        });
        associateObj = JSON.parse(JSON.stringify(associateObj));
        if (associateObj && associateObj.user) {
            var type_code = 'video_call';
            if (user.user_role && user.user_role.role_id == 3) type_code = 'home_care';

            for (var i = 0; i < services.length; i++) {
                var service = services[i];
                service.price = 0;
                service.is_staff = true;
                try {
                    let sql = `SELECT cs.id,MAX(cs.copay) price, insured_cover,cs.copay,cs.total,cs.id FROM company_services cs,user_specialities us,associates a WHERE cs.status=1 AND cs.expertise_level=${user.expertise_level} AND cs.user_id = a.user_id AND a.associate=${user_id} AND cs.user_speciality_id=us.id AND us.speciality_id=${service.speciality_id} AND us.department_id=${service.department_id} AND cs.type_code="${type_code}"`;
                    sql += ` AND cs.insurance_provider_id is null`;

                    var queryResult = await db.queryRun(sql);
                    if (queryResult && queryResult[0] && queryResult[0].id) {
                        service.price = queryResult[0].price || 0;
                        service.isClinicSpeciality = true;
                        if (queryResult[0].insured_cover) service.insured_cover = queryResult[0].insured_cover;
                    } else {
                        service.isClinicSpeciality = false;
                    }
                } catch (error) {
                    console.log(error);
                }
            }

        }
    } catch (e) {
        console.log('error', e);
    }

}


module.exports = {
    upload,
    uploadTempStorage,
    councelling_type,
    councelling_link,
    timeFormat,
    scheduleTimeFormat,
    dateFormat,
    getAge,
    validateEmail(email) {
        if (!!!email) {
            return true;
        }
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    },
    isMatchBloodGroup(bloodGroup) {
        if (!bloodGroup) {
            return true;
        }
        var mob = /^(A|B|AB|O)[+-]$/;
        return mob.test(bloodGroup);
    },
    isFinitValue(weight) {
        if (!weight) {
            return true;
        }
        return !isNaN(parseFloat(weight)) && isFinite(weight);
    },
    isValidMobileNumber(MobileNumber) {
        var mob = /^[1-9]{1}[0-9]{9}$/;
        return mob.test(MobileNumber);
    },
    isValidDob(dob) {
        if (!!!dob) {
            return true;
        }
        let d = new Date(dob);
        let stat = d instanceof Date && !isNaN(d);
        return stat;
    },
    isValidGender(gender) {
        if (!!!gender) {
            return true;
        }
        var genderUser = gender.toUpperCase();
        return ['FEMALE', 'MALE'].includes(genderUser);
    },
    isValidName(str) {
        if (!!!str) {
            str = '';
            return true;
        }
        // let string = /^[a-z\s]+$/i;
        return (typeof str == 'string');
    },
    ExcelDateToJSDate(serial) {
        if (!!!serial) return null;
        var utc_days = Math.floor(serial - 25569);
        var utc_value = utc_days * 86400;
        var date_info = new Date(utc_value * 1000);

        var fractional_day = serial - Math.floor(serial) + 0.0000001;

        var total_seconds = Math.floor(86400 * fractional_day);

        var seconds = total_seconds % 60;

        total_seconds -= seconds;

        var hours = Math.floor(total_seconds / (60 * 60));
        var minutes = Math.floor(total_seconds / 60) % 60;

        return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
    },
    async sendSmsOtp(msg, to, from) {
        return client.messages
            .create({
                body: msg,
                from: from,
                to: to
            })
            .then(message => console.log(message.sid)).catch(err => console.log(err));
    },
    async sendEmail(toMail, subject, content, template_id) {
        let testAccount = await nodemailer.createTestAccount();
        let transporter = nodemailer.createTransport({
            // host: "smtp.office365.com",
            // port: 587,
            secure: false,
            // auth: {
            //     user: 'noreply@docty.ai',
            //     pass: 'Docty#321'
            // }

            SES: new AWS.SES(config.ses_config)

        });
        try {
            db.email_conversation.upsert({
                template_id: template_id, to: toMail.toString(), subject: subject, message: content.html, reference: content.reference, identifier: content.identifier
            }).catch(console.log);
        } catch (e) { }
        return await transporter.sendMail({
            from: 'Docty.ai <noreply@docty.ai>',//`${process.env.title} <${process.env.FROM_EMAIL}>`,
            to: toMail,
            subject: subject,
            text: content.text,
            html: content.html,
            attachments: content.attachments
        }).then(res => {
            return Promise.resolve(res);
        }).catch(err => {
            return Promise.reject(err);
        }).finally(() => {
            transporter.close();
        });

    },
    generateToken: generateToken,
    S3UploadToFile: (filePath, key, folder = 'pdf', contentType = 'application/pdf') => {
        const bucket = new S3(awsCred);

        const params = {
            Bucket: awsBucket,
            Key: `${folder}/${key}`,
            Body: filePath,
            ACL: 'public-read',
            ContentType: contentType
        };

        return bucket.upload(params, (err, data) => {
            if (err) {
                console.log('There was an error uploading your file: ', err);
                return false;
            }
            console.log('Successfully uploaded file.', data);
            return data;
        }).promise();
    },
    S3UploadBase64: (base64, folder = 'images') => {
        const type = base64.split(';')[0].split('/')[1];
        const base64Data = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const bucket = new S3(awsCred);

        const params = {
            Bucket: awsBucket,
            Key: `${folder}/${Date.now()}.${type}`,
            Body: base64Data,
            ACL: 'public-read',
            ContentType: `image/${type}`
        };

        return bucket.upload(params, (err, data) => {
            if (err) {
                console.log('There was an error uploading your file: ', err);
                return false;
            }
            console.log('Successfully uploaded file.', data);
            return data;
        }).promise();
    },

    getNewPassword: () => {
        return new Promise((resolve, reject) => {
            var password = generator.generate({ length: 10, numbers: true });
            bcrypt.genSalt(10, function (err, salt) {
                if (err) {
                    reject(err);
                    return;
                }
                bcrypt.hash(password, salt, function (err, hashPassword) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    console.log(hashPassword, password)
                    resolve({ hashPassword: hashPassword, password: password });
                });
            });
        });
    },

    calculateTriage: (user) => {
        var triage = '';
        if (user.symptom_analysis && user.symptom_analysis.length > 0) {
            var symptom = user.symptom_analysis[user.symptom_analysis.length - 1]; // last symptom
            if (typeof symptom.tirage === 'string') {
                try {
                    symptom.tirage = JSON.parse(symptom.tirage); // win10 : mysql : json not working
                    symptom.tirage = JSON.parse(symptom.tirage); // 
                } catch (e) { }
            }
            if (typeof symptom.conditions === 'string') {
                try {
                    symptom.conditions = JSON.parse(symptom.conditions); // win10 : mysql : json not working
                } catch (e) { }
            }
            symptom.common_name = '';
            symptom.probability = -1;
            var conditions = symptom.conditions || [];
            conditions.forEach(condition => {
                if (symptom.probability < condition.probability) {
                    symptom.probability = condition.probability;
                    symptom.common_name = condition.common_name;
                    triage = `${condition.common_name} ${condition.probability}`;
                }
            });
        }
        return triage;
    },
    // retail_clinic => Retail Clinic
    capitalize: (str) => (str || '').replace('_', ' ').replace(/(?:^|\s|["'([{])+\S/g, match => match.toUpperCase()),
    findSuccessManager: findSuccessManager,
    userStatus: userStatus,
    getUserDomain: async (user_id) => {
        var baseDomain = config.baseDomain || 'docty.ai';

        var subdomain = '';
        try {
            var role = await db.user_role.findOne({ include: ['role_info'], where: { user_id: user_id } });
            if (role && role.role_info && role.role_info.role) subdomain = role.role_info.role.toLowerCase();
        } catch (e) { }
        subdomain = subdomain.replace('retail clinic', 'clinic');
        return config.domains[subdomain];
    },
    getClinicOfUser: getClinicOfUser,
    calculateServicePrice: calculateServicePrice,
    getTranslations: getTranslations,
    getTranslation: getTranslation,
    unSlug: unSlug,
    TIME_ZONE_TRANSFORM: TIME_ZONE_TRANSFORM
};