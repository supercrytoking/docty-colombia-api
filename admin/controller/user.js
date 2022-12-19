const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../../models");

const bcrypt = require("bcryptjs");

const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");

const {
    generateToken,
    calculateTriage,
    capitalize,
    getNewPassword,
    findSuccessManager,
    dateFormat,
    timeFormat,
    getUserDomain,
    S3UploadToFile,
} = require("../../commons/helper");

const userInfoValidation = require("../../validation/user-info");
const { upload } = require("../../commons/fileupload");

var xlsx = require("node-xlsx");
const { addActivityLog } = require("./activityLog");

const { crmTrigger, otpTrigger } = require("../../commons/crmTrigger");

const { getLimitOffset, limit } = require("../../commons/paginator");
const { getAge } = require("../../commons/helper");
const {
    response,
    errorResponse,
    responseObject,
} = require("../../commons/response");
const config = require(__dirname + "/../../config/config.json");

var xlsx = require("node-xlsx");
// const User = require("../models/Users");
async function userRegistration(req, res, next) {
    const { errors, isValid } = validateRegisterInput.validateRegisterInput(
        req.body
    );
    if (!isValid) {
        return res.status(400).json({
            error_code: 101,
            status: false,
            errors: errors,
        });
    } else {
        try {
            var user = await db.user.findOne({
                where: {
                    email_verified: 1,
                    [Op.or]: [
                        { email: req.body.email },
                        { phone_number: req.body.phone_number },
                    ],
                },
            });
            if (user) {
                if (user.email == req.body.email) {
                    return res.status(409).json({
                        error_code: 102,
                        status: false,
                        errors: "SERVER_MESSAGE.EMAIL_UNAVALABLE",
                        // data: user
                    });
                }
                if (user.phone_number == req.body.phone_number) {
                    return res.status(409).json({
                        error_code: 103,
                        status: false,
                        errors: "SERVER_MESSAGE.PHONE_UNAVALABLE",
                    });
                }
            }
            req.body.status = 0;

            bcrypt.genSalt(10, async function(err, salt) {
                bcrypt.hash(req.body.password, salt, async function(err, hash) {
                    if (err) throw err;
                    req.body.password = hash;
                    let data = req.body;
                    var role_id = req.body.role;
                    // if (role_id == 2) {
                    //   data.status = 1;
                    // } else {
                    //   data.status = 0;
                    // }
                    delete req.body.role_id;
                    let u = await db.user.findOrCreate({ where: { email: data.email } });
                    var result = u[0];
                    if (result) {
                        var role_data = await db.user_role.findOrCreate({
                            where: { user_id: result.id, role_id: role_id },
                        });
                        role_data[0].update({ role_id: role_id });
                        const otp = Math.floor(100000 + Math.random() * 900000);
                        let responce = await db.pin.create({
                            user_id: result.id,
                            pin: otp,
                            status: 0,
                        });
                        let trigger = "OTP";
                        switch (role_id) {
                            case 1:
                                trigger = "New_Doctor_Signup";
                                break;
                            case 2:
                                trigger = "New_Patient_Signup";
                                break;
                            case 3:
                                trigger = "New_Nurse_Signup";
                                break;
                            case 4:
                                trigger = "New_Lab_Signup";
                                break;
                            case 5:
                                trigger = "New_Clinic_Signup";
                                break;
                            case 6:
                                trigger = "New_Pharmacy_Signup";
                                break;
                        }
                        otpTrigger(
                            trigger, {
                                email: req.body.email,
                                subject: "Docty Health Care: One Time Password",
                                userName: req.body.first_name,
                                otp: otp,
                                text: `Please use this OTP for your account verification.`,
                            },
                            req.lang
                        );

                        try {
                            var admin = await findSuccessManager();
                            if (admin && admin.id) {
                                await db.user_profile_reviewer.upsert({
                                    user_id: result.id,
                                    admin_id: admin.id,
                                });
                                // ignore crmTrigger for automatic reviewer assign [https://doctyai.atlassian.net/browse/DBT-17]
                                // crmTrigger('Reviewer_Assigned', { email: data.email, reviewer: admin.fullName, userName: data.first_name }, req.lang || 'en')
                                // crmTrigger('New_Lead_Assigned', { email: admin.email, user: data.first_name, userName: admin.fullName, user_type: '' }, req.lang || 'en');
                            }
                        } catch (e) {
                            console.log(e);
                        }
                        addActivityLog({
                            user_id: result.id,
                            type: "New Signup",
                            details: `User ${result.email} is registered`,
                        });
                        res.status(200).send({
                            error: false,
                            status: "Success",
                            message: "User account is successfully created. Please enter OTP to verify your account !",
                            data: { user_id: result.id },
                        });
                    } else {
                        return res.status(500).json({
                            error_code: 109,
                            status: false,
                            errors: "User account not created. Please try again",
                        });
                    }
                });
            });
        } catch (error) {
            return res.status(500).json({
                error_code: 101,
                status: false,
                errors: `${error}`,
            });
        }
    }
}

async function checkUserFmaily(req, res, next) {
    try {
        const login_id = req.body.login_id;
        const password = req.body.password;

        let attributes = [
            "id",
            "user_id",
            "first_name",
            "gender",
            "email",
            "password",
            "phone",
            "last_name",
            "middle_name",
            "national_id",
            "dob",
            "relation",
            "note",
            "image",
            "allow_access",
            "emergency_contact",
        ];

        var user_family = await db.user_family.findOne({
            attributes: attributes,
            where: {
                [Op.or]: [{
                        email: {
                            [Op.eq]: login_id
                        }
                    },
                    {
                        phone: {
                            [Op.eq]: login_id
                        }
                    },
                ],
            },
            include: [{ model: db.user, as: "user" }],
        });

        if (!user_family) {
            return res.status(406).json({
                error_code: 106,
                status: false,
                errors: "User id is not correct",
            });
        }

        if (!user_family.allow_access) {
            return res.status(406).json({
                error_code: 105,
                status: false,
                errors: "Your account is not allow access",
            });
        }

        var isMatch = await bcrypt.compare(password, user_family.password);
        if (isMatch) {
            delete user_family.dataValues.password;
            // let expiredAt = new Date();
            // const minuts = expiredAt.getHours();
            // let expitedAt1 = new Date(expiredAt.setHours(minuts + 2000));
            const hash = await generateToken({ name: user_family.first_name, group: "client", role: 2 });
            const token = await db.token.create({
                userId: user_family.user_id,
                token: hash,
                expired_at: null,
                login_as: user_family.dataValues.id,
            });

            var user = await db.user.findOne({
                attributes: [
                    "id",
                    "first_name",
                    "middle_name",
                    "last_name",
                    "email",
                    "password",
                    "national_id",
                    "city_code",
                    "device_id",
                    "device_type",
                    "picture",
                    "company_name",
                    "dob",
                    "status",
                ],
                where: { id: user_family.user_id },
                include: [{ model: db.user_role, attributes: ["role_id"] }],
            });
            user = user.dataValues;

            user_family.dataValues.user_role = user.user_role;
            user_family.dataValues.parent = user;

            return res.set("auth-token", hash).status(200).json({
                error: false,
                status: "Success",
                user: user_family,
            });
        } else {
            return res.status(400).json({
                error_code: 107,
                status: false,
                errors: "Password is not correct",
            });
        }
    } catch (e) {
        return res.status(400).json({
            error_code: 107,
            status: false,
            errors: e,
        });
    }
}

async function login(req, res, next) {
    try {
        const { errors, isValid } = validateLoginInput(req.body);
        // Check validation
        if (!isValid) {
            return res.status(400).json(errors);
        }
        const login_id = req.body.login_id;
        const password = req.body.password;
        let attributes = [
            "id",
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "password",
            "national_id",
            "city_code",
            "device_id",
            "device_type",
            "picture",
            "company_name",
            "dob",
            "status",
            "isAvailableStatus",
            "isSigned",
        ];
        let role_attributes = ["role_id"];
        var user = await db.user.findOne({
            attributes: attributes,
            include: [
                "charges",
                "availability",
                "practice",
                "services",
                "education", // 'user_role',
                "address",
                "user_location",
                // 'isAvailableStatus',
                { model: db.user_role, attributes: role_attributes },
            ],
            where: {
                [Op.or]: [{
                        email: {
                            [Op.eq]: login_id
                        }
                    },
                    {
                        phone_number: {
                            [Op.eq]: login_id
                        }
                    },
                ],
            },
            // include: [{ model: db.user_role, attributes: role_attributes }]
        });
        if (!user) {
            return checkUserFmaily(req, res, next);
        }
        if (!!user.email_verified) {
            return res.status(406).json({
                error_code: 105,
                status: false,
                errors: "Email is not verified",
            });
        }
        var isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            delete user.dataValues.password;
            await user.update({ isAvailableStatus: false });
            const hash = await generateToken({ name: user.first_name, group: "client", role: user.user_role.role_id });
            await db.token.destroy({ where: { userId: user.id, login_as: 0 } });
            const token = await db.token.create({
                userId: user.id,
                token: hash,
                expired_at: null,
                login_as: 0,
            });
            return res.set("auth-token", hash).status(200).json({
                error: false,
                status: "Success",
                user: user,
            });
        } else {
            return res.status(400).json({
                error_code: 107,
                status: false,
                errors: "Password is not correct",
            });
        }
    } catch (error) {
        return res.status(500).json({
            error_code: 105,
            status: false,
            error: `${error}`,
        });
    }
}

async function validatePin(req, res, next) {
    console.log(req.body);
    try {
        let data = req.body;
        // const { errors, isValid } = pinValidation(data);
        // if (!isValid) {
        //     return res.status(400).json({
        //         error: true,
        //         status: false,
        //         errors: errors
        //     });
        // }
        db.pin
            .findOne({ where: { user_id: data.user_id, pin: data.pin } })
            .then(async(resp) => {
                db.user
                    .update({ email_verified: 1 }, {
                        where: { id: data.user_id },
                    })
                    .then(async() => {
                        await resp.update({ status: 1 });

                        res.status(200).json({
                            error: false,
                            status: "Success",
                            message: "Email verified successfully",
                        });
                    })
                    .catch((err) => {
                        res.status(400).json({
                            error: `${err}`,
                            status: false,
                            message: "Invalid Pin",
                        });
                    });
            });
    } catch (error) {
        return res.status(500).json({
            error_code: 105,
            status: false,
            error: `${error}`,
        });
    }
}
// const { errors, isValid } = validateRegisterInput.validateRegisterInput(req.body);
async function resetPassword(req, res, next) {
    try {
        bcrypt.genSalt(10, async function(err, salt) {
            bcrypt.hash(req.body.password, salt, async function(err, hash) {
                if (err) throw err;
                //console.log(hash);
                let new_password = hash;
                var result = await db.user.update({ password: new_password }, { where: { id: req.body.user_id } });
                if (result && result != 0) {
                    res.status(200).json({
                        error: "false",
                        status: "Success",
                        message: "Password successfully updated !",
                        data: result,
                    });
                } else {
                    return res.status(500).json({
                        error_code: 109,
                        status: false,
                        errors: "Password Not updated. Please try again !",
                    });
                }
            });
        });
    } catch (error) {
        return res.status(500).json({
            error_code: 105,
            status: false,
            error: `${error}`,
        });
    }
}

async function resetTemporaryPassword(req, res, next) {
    try {
        var passwordObject = await getNewPassword();
        var result = await db.user.findOne({ where: { id: req.body.user_id } });
        if (result) {
            await result.update({ password: passwordObject.hashPassword, need_password_reset: true });
            crmTrigger(
                "Login_Details_Generated", {
                    email: req.body.email,
                    password: passwordObject.password,
                    link: await getUserDomain(req.body.user_id),
                    provider_name: result.fullName
                },
                req.lang || "en"
            );

            res.status(200).json({
                error: false,
                status: "Success",
                message: "Password successfully updated !",
                data: passwordObject.password,
            });
        } else {
            return res.status(500).json({
                error_code: 109,
                status: false,
                errors: "Password Not updated. Please try again !",
            });
        }
    } catch (error) {
        return res.status(500).json({
            error_code: 105,
            status: false,
            error: `${error}`,
        });
    }
}

async function checkUniqueField(req, res, next) {
    const value = req.body.value;
    const field = req.body.field;
    if (value && field) {
        const user = await db.user.findOne({
            where: {
                [field]: value
            }
        });
        if (user) {
            return res.status(409).json({
                error_code: 102,
                status: false,
                errors: `${field} id already configured`,
            });
        }
        return res.send(null);
    } else {
        return res.send(null);
    }
}

async function updateUserProfile(req, res, next) {
    if (req.user && req.user.id) {
        upload(req, "avatar", "file").then(async(resp) => {
            await db.user.update({ picture: resp.path }, { where: { id: req.user.id } });
            res
                .send({
                    status: true,
                    path: resp.path,
                    // bug
                })
                .catch((err) => {
                    res.status(404).json({
                        error: true,
                        status: false,
                        errors: `${err}`,
                    });
                });
        });
    } else {
        res.status(404).json({
            error: true,
            status: false,
            errors: `AUTH MISSING`,
        });
    }
}

async function updateSignature(req, res, next) {
    if (req.user && req.user.id) {
        upload(req, "signature", "file").then(async(resp) => {
            await db.user.update({ signature: resp.path }, { where: { id: req.user.id } });
            res
                .send({
                    status: true,
                    path: resp.path,
                    // bug
                })
                .catch((err) => {
                    res.status(404).json({
                        error: true,
                        status: false,
                        errors: `${err}`,
                    });
                });
        });
    } else {
        res.status(404).json({
            error: true,
            status: false,
            errors: `AUTH MISSING`,
        });
    }
}

async function unlockUserProfile(req, res, next) {
    if (req.user && req.user.id) {
        var user = await db.user.findOne({ where: { id: req.body.user_id } });
        await user.update({ isSigned: false });
        await db.signedContract.update({ status: 0 }, { where: { user_id: req.body.user_id } });
        crmTrigger(
            "Profile_Unlock_By_Reviewer", {
                email: user.email,
                user_name: user.fullName,
                reviewer_name: req.user.first_name,
                remark: req.body.remark,
            },
            user.lang || req.lang
        );
        res.send({ status: true });
    } else {
        res.status(404).json({
            error: true,
            status: false,
            errors: `AUTH MISSING`,
        });
    }
}

async function userInfo(req, res, next) {
    // res.send(req.lang)
    if (req.user && req.user.id) {
        if (req.user.isSeconday) {
            console.log(req.user.user_id, req.user.id);
            let address = await db.address.findOne({
                where: { user_id: req.user.user_id, family_id: req.user.id },
            });
            let insurance = await db.user_insurance.findOne({
                where: { user_id: req.user.user_id, member_id: req.user.id },
            });
            let familyInclude = [
                "user_id",
                "first_name",
                "gender",
                "email",
                "password",
                "phone",
                "last_name",
                "middle_name",
                "national_id",
                "dob",
                "relation",
                "note",
                "image",
                "allow_access",
                "emergency_contact",
                "fullName",
                "need_password_reset",
            ];
            db.user_family
                .findOne({
                    where: { id: req.user.id },
                    attributes: familyInclude,
                })
                .then(async(data) => {
                    let d = JSON.parse(JSON.stringify(data));

                    var user = await db.user.findOne({
                        attributes: [
                            "id",
                            "first_name",
                            "middle_name",
                            "last_name",
                            "email",
                            "password",
                            "national_id",
                            "city_code",
                            "device_id",
                            "device_type",
                            "picture",
                            "company_name",
                            "dob",
                            "status",
                            "isAvailableStatus",
                            "isSigned",
                        ],
                        where: { id: req.user.user_id },
                        include: [{ model: db.user_role, attributes: ["role_id"] }],
                    });
                    user = user.dataValues;

                    d.user_role = user.user_role;
                    d.parent = user;

                    let resData = {...d, address, insurance };
                    resData["profile_completion_status"] = profileCompletionStatus(
                        req.user.role,
                        resData
                    );
                    console.log(resData["profile_completion_status"]);
                    // console.log(JSON.parse(JSON.stringify(resData)))
                    res.send(resData);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(404).json({
                        error: true,
                        status: false,
                        errors: `${err}`,
                    });
                });
            return;
        }

        let userId = req.user.id;
        if (req.query && req.query.id) {
            userId = req.query.id;
        }

        let address = await db.address.findOne({
            where: { user_id: userId, family_id: 0 },
        });
        let insurance = await db.user_insurance.findOne({
            where: { user_id: userId, member_id: 0 },
        });
        let include = [
            "charges",
            "availability",
            "practice",
            "services",
            "education",
            "user_role",
            "contract",
            "user_medical",
            "licence",
            "rating_summary",
        ];
        if (req.query && req.query.includes) {
            include = req.query.includes.split(",");
        }
        db.user
            .findByPk(userId, {
                include: include,
            })
            .then(async(data) => {
                let d = JSON.parse(JSON.stringify(data));
                var services = [];
                try {
                    services = await db.user_service.findAll({
                        where: { user_id: d.id },
                        include: ["department", "speciality"],
                    });
                } catch (e) {}
                d.services = services;
                let resData = {...d, address, insurance };
                resData["profile_completion_status"] = profileCompletionStatus(
                    req.user.role,
                    resData
                );
                // console.log(JSON.parse(JSON.stringify(resData)))
                res.send(resData);
            })
            .catch((err) => {
                res.status(404).json({
                    error: true,
                    status: false,
                    errors: `${err}`,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

async function updateUserInfo(req, res, next) {
    const { errors, isValid } = userInfoValidation.userInfoValidation(req.body);
    if (!isValid) {
        return res.status(400).json({
            error_code: 101,
            status: false,
            errors: errors,
        });
    } else {
        let data = req.body;
        if (req.user && req.user.id) {
            db.user
                .update(data, { where: { id: req.user.id } })
                .then((r) => {
                    res.send({
                        status: true,
                        user: r,
                    });
                })
                .catch((errors) => {
                    res.status(406).send({
                        error_code: 101,
                        status: false,
                        errors: data,
                    });
                });
            addActivityLog({
                user_id: req.user.id,
                type: "user information updated",
            });
        } else {
            res.sendStatus(406);
        }
    }
}

async function getUserAvailability(req, res, next) {
    if (req.user && req.user.id && req.body.id) {
        db.user_availability
            .findAll({ where: { user_id: req.user.id, location_id: req.body.id } })
            .then((data) => {
                res.send(data);
            })
            .catch((err) => {
                res.status(404).json({
                    error: true,
                    status: false,
                    errors: `${err}`,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

async function addUserSkill(req, res, next) {
    let data = req.body;
    if (req.user && req.user.id) {
        data["user_id"] = req.user.id;
        try {
            let resp = await db.user_skill.upsert(data);
            res.send({
                status: true,
                data: resp,
            });
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error,
            });
        }
    } else {
        res.sendStatus(406);
    }
}

async function removeUserSkill(req, res, next) {
    if (req.user && req.user.id && req.body.id) {
        try {
            let resp = await db.user_skill.destroy({ where: { id: req.body.id } });
            res.send({
                status: true,
                data: resp,
            });
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error,
            });
        }
    } else {
        res.sendStatus(406);
    }
}

async function skills(req, res, next) {
    if (req.user && req.user.id) {
        db.user_skill
            .findAll({ where: { user_id: req.user.id } })
            .then((resp) => {
                res.send(resp);
            })
            .catch((err) => {
                res.status(400).send({
                    status: false,
                    errors: err,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

async function skill(req, res, next) {
    if (req.user && req.user.id && req.body.id) {
        db.user_skill
            .findByPk(req.body.id)
            .then((resp) => {
                res.send(resp);
            })
            .catch((err) => {
                res.status(400).send({
                    status: false,
                    errors: err,
                });
            });
    } else {
        res.sendStatus(406);
    }
}
async function resendOtp(req, res, next) {
    let data = req.body;
    if (data.user_id) {
        let user = await db.user.findByPk(data.user_id);
        if (user) {
            const otp = Math.floor(100000 + Math.random() * 900000);
            let responce = await db.pin.create({
                user_id: data.user_id,
                pin: otp,
                status: 0,
            });
            crmTrigger(
                "OTP", {
                    email: user.email,
                    subject: "Docty Health Care: One Time Password",
                    userName: user.first_name,
                    otp,
                    text: `Please use this OTP for your account verification.`,
                },
                user.lang || req.lang
            );
            res.status(200).send({
                error: false,
                status: "Success",
                message: "OTP is resend to your mail. Please enter OTP to activate your account !",
                data: { user_id: data.user_id },
            });
        } else {
            res.status(400).send({
                status: false,
                errors: "user not exists.",
            });
        }
    } else {
        res.sendStatus(400);
    }
}

async function getUsers(req, res, next) {
    let search = "";
    let page = 1;
    let orderKey = "first_name";
    let order = "asc";
    var role;
    if (req.body) {
        let data = req.body;
        search = data.search || "";
        orderKey = data.orderKey || "first_name";
        order = data.order || "asc";
        page = data.page || 1;
        role = data.role;
    }
    var where = {};
    if (search && search.length > 0) {
        where = {
            [Op.or]: [{
                    first_name: {
                        [Op.like]: `%${search}%`
                    }
                },
                {
                    middle_name: {
                        [Op.like]: `%${search}%`
                    }
                },
                {
                    last_name: {
                        [Op.like]: `%${search}%`
                    }
                },
                {
                    email: {
                        [Op.like]: `%${search}%`
                    }
                },
                {
                    phone_number: {
                        [Op.like]: `%${search}%`
                    }
                },
                {
                    company_name: {
                        [Op.like]: `%${search}%`
                    }
                },
                {
                    website: {
                        [Op.like]: `%${search}%`
                    }
                },
            ],
        };
    }

    var include = [{
        model: db.associate,
        as: "associate",
        include: ["admin", "user"],
    }, ];

    if (role) {
        include.push({
            model: db.user_role,
            as: "user_role",
            where: { role_id: role },
        });
    }
    if (req.query && req.query.id) {
        where.id = req.query.id;
    }
    if (req.query && req.query.online) {
        where.isAvailableStatus = true;
    }
    if (req.query && req.query.status) {
        where.status = req.query.status;
    }
    if (req.body && req.body.status) {
        where.status = req.body.status;
    }

    if (req.query && req.query.includes) {
        include = include.concat(req.query.includes.split(","));
    }

    if (req.query && req.query.dated) {
        if (req.query && req.query.dateTo) {
            include.push({
                model: db.schedule,
                where: {
                    start: {
                        [Op.gte]: new Date(req.query.dated)
                    },
                    end: {
                        [Op.lte]: new Date(req.query.dateTo)
                    },
                    calendarId: {
                        [Op.in]: [4]
                    },
                },
                as: "schedule",
            });
        } else {
            include.push({
                model: db.schedule,
                where: {
                    start: {
                        [Op.gte]: new Date(req.query.dated)
                    }
                },
                as: "schedule",
                calendarId: {
                    [Op.in]: [4]
                },
            });
        }
    }

    db.user
        .findAndCountAll({
            where: where,
            order: [
                [orderKey, order]
            ],
            limit: getLimitOffset(page),
            include: include,
        })
        .then((resp) => {
            return response(res, resp);
        })
        .catch((err) => {
            return errorResponse(res, err);
        });
}

async function getAvailableSloatOfClinic(clinic_id) {
    let start = new Date();
    let end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    let scheduleList = [];
    try {
        var myStaff = await db.user.findAll({
            include: [{
                    model: db.user_role,
                    as: "user_role",
                    where: {
                        role_id: {
                            [Op.in]: [1, 3]
                        }, //doctor & nurse
                    },
                },
                {
                    model: db.associate,
                    as: "associate",
                    where: { user_id: clinic_id },
                },
            ],
        });
        var staffIdList = [];
        if (myStaff) staffIdList = myStaff.map((item) => item.id);

        let resp = await db.schedule.findAll({
            where: {
                user_id: {
                    [Op.in]: staffIdList
                },
                calendarId: {
                    [Op.in]: [4]
                },
                start: {
                    [Op.gte]: start
                },
                end: {
                    [Op.lte]: end
                },
                state: {
                    [Op.ne]: "Busy"
                },
            },
            order: [
                ["start", "asc"]
            ],
            // limit: 1
        });
        let data = JSON.parse(JSON.stringify(resp));
        scheduleList = data.filter((e) => new Date(e.start).getTime() > Date.now());
    } catch (e) {}
    return scheduleList;
}

async function getClinicOfUser(user_id) {
    try {
        var associateObj = await db.associate.findOne({
            where: {
                associate: user_id,
            },
            include: [{
                model: db.user,
                as: "user",
                attributes: ["id", "company_name", "picture"],
                include: ["insurance_associates"],
            }, ],
        });
        associateObj = JSON.parse(JSON.stringify(associateObj));
        return associateObj.user;
    } catch (e) {}
    return null;
}

async function getUsersEx(req, res, next) {
    let where = {
        status: {
            [Op.gt]: 0
        }
    };
    if (req.body.id) {
        where.id = req.body.id;
    }
    if (req.query && req.query.id) {
        where.id = req.query.id;
    }
    if (req.body.name) {
        where.first_name = {
            [Op.like]: "%" + req.body.name + "%",
        };
    }
    if (req.body.email) {
        where.email = req.body.email;
    }
    if (req.body.national_id) {
        where.national_id = req.body.national_id;
    }
    if (req.body.phone_number) {
        where.phone_number = req.body.phone_number;
    }
    if (req.body.status) {
        where.status = req.body.status;
    }
    if (req.body.website) {
        where.website = req.body.website;
    }
    if (req.body.company_name) {
        where.company_name = {
            [Op.like]: "%" + req.body.company_name + "%",
        };
    }
    if (req.body.search) {
        where.company_name = {
            [Op.like]: "%" + req.body.search + "%",
        };
    }

    if (req.body.dob) {
        where.dob = req.body.dob;
    }
    if (req.query && req.query.online) {
        where.isAvailableStatus = true;
    }
    if (req.query && req.query.status) {
        where.status = req.query.status;
    }

    let page = 1;
    let order = [];
    if (req.query && req.query.page) {
        page = req.query.page;
    } else if (req.body.page) {
        page = req.body.page;
    }
    if (req.query && req.query.order) {
        order.push(req.query.order);
    } else if (req.body.order) {
        order.push(req.body.order);
    }
    if (req.query && req.query.order_by) {
        order.push(req.query.order_by);
    } else if (req.body.order_by) {
        order.push(req.body.order_by);
    }
    let include = [
        "country",
        "state",
        "city",
        "user_medical",
        "licence",
        "family",
        "availability",
        "practice",
        "services",
        "education",
        "user_location",
        "documents",
        "skills",
        "user_speciality",
        "rating_summary",
    ];
    if (req.query && req.query.includes) {
        include = req.query.includes.split(",");
    }
    // if (req.query && req.query.need_company) {
    //   include.push({ model: db.associate, required: false, as: 'associate', include: [{ model: db.user, as: 'user', attributes: ['id', 'company_name', 'picture'], include: ['insurance_associates'] }] })
    //   include.push({
    //     model: db.my_favorite,
    //     as: 'favorite_of',
    //     left: false,
    //     // paranoid: false,
    //     required: false,
    //     where: { user_id: req.user.id }
    //   })

    //

    // }
    if (req.query.department_id || req.body.department_id) {
        let depId = req.query.department_id || req.body.department_id;
        let w = { department_id: depId };
        include.push({
            model: db.user_service,
            as: "services",
            where: w,
            include: ["department"],
        });
    } else {
        include.push({
            model: db.user_service,
            as: "services",
            include: ["department"],
        });
    }

    include.push("insurance_associates");

    if (req.query && req.query.role && req.query.role == 5) {
        // retail clinics
        include.push({
            model: db.user_service,
            as: "services",
            include: ["department"],
        });
        include.push("insurance_associates");
        include.push({
            model: db.my_favorite,
            as: "favorite_of",
            left: false,
            // paranoid: false,
            required: false,
            where: { user_id: req.user.id },
        });
    }

    if (req.query && req.query.role && req.query.role == 6) {
        // pharmacy
    }

    if (req.query && req.query.dated) {
        include.push({
            model: db.schedule,
            where: {
                start: {
                    [Op.gte]: new Date(req.query.dated)
                }
            },
            as: "schedule",
            calendarId: {
                [Op.in]: [4]
            },
            state: {
                [Op.ne]: "Busy"
            },
        });
    }
    if ((req.query && req.query.role) || req.body.role) {
        let role_id = req.query.role || req.body.role;
        include.push({
            model: db.user_role,
            where: { role_id },
        });
        if (role_id !== 2) {
            include.push("address");
        }
    } else {
        include.push("user_role");
    }

    let options = {
        include: include,
        where: where,
        limit: getLimitOffset(page),
        distinct: true,
        col: `id`,
    };

    db.user
        .findAndCountAll(options)
        .then(async(resp) => {
            try {
                resp = JSON.parse(JSON.stringify(resp));
                // let d = JSON.parse(JSON.stringify(resp));
                // if (req.query && req.query.role && req.query.role == 6) {
                //   var userList = d.rows;
                //   var idList = userList.map(user => user.id);
                //   console.log(idList);
                //   var offerList = await db.offer.findAll({ where: { user_id: { [Op.in]: idList } } });
                //   userList.forEach(user => {
                //     user.offer = offerList.filter(offer => offer.user_id == user.id);
                //   })
                // }
                // res.send(d)
                if (req.query && req.query.role && req.query.role == 5 && resp.rows) {
                    for (var i = 0; i < resp.rows.length; i++) {
                        let user = resp.rows[i];
                        let r = await getAvailableSloatOfClinic(user.id);
                        user.schedule = r;
                    }
                }
                if (req.query && req.query.need_company) {
                    for (var i = 0; i < resp.rows.length; i++) {
                        let user = resp.rows[i];
                        var parent = await getClinicOfUser(user.id);
                        if (parent) user.associatedTo = { user: parent };
                    }
                }
                res.send(resp);
            } catch (e) {
                console.log(e);
                throw e;
            }
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send({
                status: false,
                errors: `${err}`,
            });
        });
}

async function staffWithScheduleOfClinic(req, res, next) {
    if (req.user && req.user.id) {
        var user_id = req.user.id;
        if (req.query && req.query.user_id) {
            user_id = req.query.user_id;
        }
        let data = req.body;
        var roles_list = data.roles_list || [];

        var where = { status: 1 };

        let start = new Date();
        let end = new Date();
        end.setFullYear(end.getFullYear() + 1); // getAll schedule [ 1 year ]

        if (req.body.start) {
            start = new Date(req.body.start);
        }
        if (req.body.end) {
            end = new Date(req.body.end);
        }

        db.user
            .findAll({
                include: [{
                        model: db.user_role,
                        as: "user_role",
                        where: {
                            role_id: {
                                [Op.in]: roles_list
                            },
                        },
                    },
                    {
                        model: db.associate,
                        as: "associate",
                        where: { user_id: user_id },
                    },
                    "services",
                    {
                        model: db.schedule,
                        as: "schedule",
                        where: {
                            calendarId: 4,
                            state: {
                                [Op.ne]: "Busy"
                            },
                            start: {
                                [Op.gte]: start
                            },
                            end: {
                                [Op.lte]: end
                            },
                        },
                        required: false,
                    },
                ],
                where: where,
            })
            .then((resp) => {
                res.send(resp);
            })
            .catch((err) => {
                console.log(err);
                res.status(400).status({
                    status: false,
                    errors: `${err}`,
                });
            });
    } else {
        console.log("error");
        res.sendStatus(406);
    }
}

var statusOfUser = (user) => {
    if (user.status == -1) return "Suspended";
    if (user.status != -1 && user.status != 1 && !!!user.isSigned)
        return "Pending";
    if (user.status == 1 && !!!user.isSigned) return "Contract Pending";
    if (user.isSigned && user.status == 1) return "Verified";
    if (user.isSigned && user.status == 0) return "Under Review";
    return "UNKOWN";
};

async function downloadCSV(req, res, next) {
    var query = req.query;
    var attributes = [];
    if (query.role == null) {
        res.status(404).status({
            status: false,
            errors: `Requre user role`,
        });
        return;
    }
    if (query.includes) {
        attributes = query.includes.split(",");
    }

    attributes = attributes.filter(
        (a) =>
        ![
            "last_login",
            "no_of_family",
            "last_device",
            "completed_self_record",
            "chronic_condition",
        ].includes(a)
    );

    var where = {};

    if (query.status) where["status"] = query.status;

    var roles_list = [parseInt(query.role)];

    if (query.from) {
        where["createdAt"] = {
            [Op.gte]: new Date(query.from)
        };
    }
    if (query.to) {
        where["createdAt"] = {
            [Op.lte]: new Date(query.to)
        };
    }

    if (query.from && query.to) {
        where["createdAt"] = {
            [Op.and]: [{
                    [Op.gte]: new Date(query.from)
                },
                {
                    [Op.lte]: new Date(query.to)
                },
            ],
        };
    }

    var include = [{
            model: db.user_role,
            as: "user_role",
            where: {
                role_id: {
                    [Op.in]: roles_list
                },
            },
        },
        {
            model: db.symptom_analysis,
            as: "symptom_analysis",
            required: false,
        },
    ];
    if (query.role == "1" || query.role == "3") {
        include.push({
            model: db.associate,
            required: false,
            as: "associatedTo",
            include: [
                { model: db.user, as: "user", attributes: ["id", "company_name"] },
            ],
        });
        var attr = ["id", "title"];
        if (req.lang == "es") attr = [
            ["title_es", "title"], "id"
        ];
        include.push({
            model: db.user_service,
            as: "services",
            include: [{
                    model: db.speciality,
                    as: "speciality",
                    attributes: attr,
                    required: true,
                },
                {
                    model: db.department,
                    as: "department",
                    attributes: attr,
                    required: true,
                },
            ],
            required: false,
        });
        if (attributes.indexOf("success_manager") > 0) {
            include.push("reviewer");
        }
    }
    if (query.role == "2") {
        include.push({
            model: db.customer,
            required: false,
            as: "customeredTo",
            include: [
                { model: db.user, as: "user", attributes: ["id", "company_name"] },
            ],
        });
        include.push({
            model: db.activity_log,
            as: "activity_log",
            limit: 1,
            order: [
                ["createdAt", "DESC"]
            ],
            required: false,
            attributes: ["createdAt", "data"],
            where: {
                type: {
                    [Op.like]: "Login"
                },
            },
        });
        include.push({
            model: db.user_family,
            as: "family",
            attributes: ["id"],
            required: false,
        });
        include.push("user_medical");
        include.push("medical_conditions");
    }
    if (query.role == "5") {
        if (attributes.indexOf("speciality") > 0) {
            include.push("services");
        }
    }
    db.user
        .findAll({
            include: include,
            where: where,
        })
        .then((resp) => {
            var user_list = JSON.parse(JSON.stringify(resp));
            res.setHeader(
                "Content-disposition",
                "attachment; filename=user_list.xlsx"
            );
            res.setHeader(
                "Content-type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            res.charset = "UTF-8";

            var totalData = [
                ["Full Name", "Email", "Gender", "Phone Number"]
            ];
            if (attributes && attributes.length > 0) {
                totalData = [attributes.map((item) => capitalize(item))];
            }

            for (var i = 0; i < user_list.length; i++) {
                var user = user_list[i];
                user.triage = calculateTriage(user);
                if (user.associatedTo && user.associatedTo.user) {
                    // if doctor / nurse
                    user["retail_clinic"] = user.associatedTo.user.company_name || "";
                }
                if (user.customeredTo && user.customeredTo.user) {
                    // if patient
                    user["retail_clinic"] = user.customeredTo.user.company_name || "";
                }
                if (user.reviewer && user.reviewer.admin) {
                    user["success_manager"] = user.reviewer.admin.fullName || "";
                }

                user["speciality"] = (user.services || [])
                    .filter((s) => s.speciality != null)
                    .map((s) => `${s.speciality.title}`)
                    .join(", ");
                user["department"] = (user.services || [])
                    .filter((s) => s.department != null)
                    .map((s) => `${s.department.title}`)
                    .join(", ");

                user.status = statusOfUser(user);

                if (attributes && attributes.length > 0) {
                    totalData.push(
                        attributes.map((includeColumn) => user[includeColumn] || "")
                    );
                } else {
                    totalData.push([
                        user.fullName,
                        user.email,
                        user.gender,
                        user.phone_number,
                    ]);
                }
            }

            var buffer = xlsx.build([{ name: "users", data: totalData }]);
            res.write(buffer);
            res.end();
        })
        .catch((err) => {
            console.log(err);
            res.status(400).status({
                status: false,
                errors: `${err}`,
            });
        });
}

async function getUserServices(req, res) {
    db.user_service
        .findAll({
            where: { user_id: req.body.user_id },
            include: ["department", "speciality"],
        })
        .then((resp) => {
            res.send(resp);
        })
        .catch((e) => {
            res.status(406).send({
                error_code: 101,
                status: false,
                errors: e,
            });
        });
}

async function updateAvailableStatus(req, res) {
    let data = req.body;
    if (req.user && req.user.id) {
        db.user
            .update(data, { where: { id: req.user.id } })
            .then((r) => {
                res.send({
                    status: true,
                    user: r,
                });

                try {
                    global.io.emit("online_user", {
                        uid: `userid${req.user.id}`,
                        status: data.isAvailableStatus &&
                            global.onlineSocket[`userid${req.user.id}`] != null,
                    });
                } catch (e) {}
            })
            .catch((errors) => {
                res.status(406).send({
                    error_code: 101,
                    status: false,
                    errors: errors,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

function profileCompletionStatus(role, data) {
    let status = 0;
    switch (role) {
        case 1:
            status = 12.5;
            if (data.address) {
                status += 12.5;
            }
            if (data.practice && data.practice.length) {
                status += 12.5;
            }
            if (data.education && data.education.length) {
                status += 12.5;
            }
            if (data.education && data.education.length) {
                status += 12.5;
            }
            if (data.services && data.services.length) {
                status += 12.5;
            }
            if (data.licence && data.licence.length) {
                status += 12.5;
            }
            if (data.contract && data.contract) {
                status += 12.5;
            }
            status = Math.round(status);
            break;
        case 2:
            status = 25;
            if (data.address) {
                status += 25;
            }
            if (data.insurance) {
                status += 25;
            }
            if (data.user_medical) {
                status += 25;
            }
            break;
        case 3:
            break;
        case 4:
            break;
        case 5:
            break;
        case 6:
            break;
        default:
    }
    return status;
}

async function clinicInfo(req, res, next) {
    if (req.user && req.user.id) {
        var user_id = req.body.id; // clinic id
        var where = { id: user_id };
        var user = await db.user.findOne({
            where: where,
            attributes: ["id", "company_name", "picture", "createdAt"],
            include: [
                "services",
                // {
                //   model: db.associate,
                //   required: false,
                //   as: 'associate',
                //   include: [{
                //     model: db.user.scope('publicInfo'),
                //     as: 'user'
                //   }]
                // },
                "reviewer",
            ],
        });

        // Get Today Bookings of user
        var start = new Date();
        start.setHours(0);
        start.setMinutes(0);
        start.setSeconds(0);
        var end = new Date();
        end.setHours(23);
        end.setMinutes(59);
        end.setSeconds(59);

        var todayBookings = await db.booking.findAll({
            where: {
                provider_id: user_id,
                status: "accepted",
                "$schedule.end$": {
                    [Op.and]: [{
                        [Op.gte]: start
                    }, {
                        [Op.lte]: end
                    }],
                },
            },
            include: ["schedule"],
        });

        //Get Week Bookings of user
        end.setDate(end.getDate() + 7);
        var weekBookings = await db.booking.findAll({
            where: {
                provider_id: user_id,
                status: "accepted",
                "$schedule.end$": {
                    [Op.and]: [{
                        [Op.gte]: start
                    }, {
                        [Op.lte]: end
                    }],
                },
            },
            include: ["schedule"],
        });

        weekBookings = JSON.parse(JSON.stringify(weekBookings));
        // calculate weekly earning
        var weeklyEarning = 0;
        weekBookings.forEach((book) => {
            if (book.payment_status == "paid") {
                try {
                    if (typeof book.amount == "string")
                        weeklyEarning += parseFloat(book.amount);
                    else weeklyEarning += book.amount;
                } catch (e) {}
            }
        });

        var staff = await db.user.scope("publicInfo").findAll({
            include: [{
                    model: db.user_role,
                    as: "user_role",
                    where: {
                        role_id: {
                            [Op.in]: [1, 3]
                        },
                    },
                },
                {
                    model: db.associate,
                    as: "associate",
                    where: { user_id: user_id },
                },
            ],
        });
        res.send({
            user: user,
            todayBookings: todayBookings,
            weekBookings: weekBookings,
            weeklyEarning: weeklyEarning,
            staffList: staff,
        });
    } else {
        res.sendStatus(406);
    }
}
// customer of clinic
async function patientListOfClinic(req, res, next) {
    if (req.user && req.user.id) {
        let clinic_id = req.body.user_id;
        db.user
            .findAll({
                include: [{
                        model: db.customer,
                        as: "customer",
                        where: { user_id: clinic_id },
                    },
                    {
                        model: db.symptom_analysis,
                        as: "symptom_analysis",
                        include: ["userInfo"],
                    },
                ],
            })
            .then((resp) => {
                res.send(resp);
            })
            .catch((err) => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

// staff list of clinic
async function staffListOfClinic(req, res, next) {
    if (req.user && req.user.id) {
        let where = {
            // status: { [Op.gt]: 0 }
        };
        let clinic_id = req.body.user_id;
        var data = req.body;
        if (data.status) where.status = data.status;

        db.user
            .findAll({
                include: [{
                        model: db.user_role,
                        as: "user_role",
                        where: {
                            role_id: {
                                [Op.in]: data.roles_list
                            },
                        },
                    },
                    {
                        model: db.associate,
                        as: "associate",
                        where: { user_id: clinic_id },
                    },
                    "services",
                    "user_location",
                    {
                        model: db.location_open,
                        as: "location_open",
                        include: ["times"],
                    },
                ],
                where: where,
            })
            .then((resp) => {
                res.send(resp);
            })
            .catch((err) => {
                console.log(err);
                res.status(400).status({
                    status: false,
                    errors: `${err}`,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

async function doctorInfo(req, res, next) {
    if (req.user && req.user.id) {
        var user_id = req.body.id;
        var where = { id: user_id };
        var user = await db.user.findOne({
            where: where,
            attributes: [
                "id",
                "first_name",
                "last_name",
                "fullName",
                "createdAt",
                "speciality_type",
            ],
            include: [{
                    model: db.user_service,
                    required: false,
                    as: "services",
                    include: ["speciality"],
                },
                {
                    model: db.associate,
                    required: false,
                    as: "associate",
                    include: [{
                        model: db.user,
                        as: "user",
                        attributes: ["id", "company_name", "picture"],
                        include: ["insurance_associates"],
                    }, ],
                },
                "reviewer",
            ],
        });

        // Get Today Bookings of user
        var start = new Date();
        start.setHours(0);
        start.setMinutes(0);
        start.setSeconds(0);
        var end = new Date();
        end.setHours(23);
        end.setMinutes(59);
        end.setSeconds(59);

        var todayBookings = await db.booking.findAll({
            where: {
                provider_id: user_id,
                status: "accepted",
                "$schedule.end$": {
                    [Op.and]: [{
                        [Op.gte]: start
                    }, {
                        [Op.lte]: end
                    }],
                },
            },
            include: ["schedule"],
        });

        //Get Week Bookings of user
        end.setDate(end.getDate() + 7);
        var weekBookings = await db.booking.findAll({
            where: {
                provider_id: user_id,
                status: "accepted",
                "$schedule.end$": {
                    [Op.and]: [{
                        [Op.gte]: start
                    }, {
                        [Op.lte]: end
                    }],
                },
            },
            include: ["schedule"],
        });

        weekBookings = JSON.parse(JSON.stringify(weekBookings));
        // calculate weekly earning
        var weeklyEarning = 0;
        weekBookings.forEach((book) => {
            if (book.payment_status == "paid") {
                try {
                    if (typeof book.amount == "string")
                        weeklyEarning += parseFloat(book.amount);
                    else weeklyEarning += book.amount;
                } catch (e) {}
            }
        });
        user = JSON.parse(JSON.stringify(user));

        user.services = user.services || [];
        user.services = user.services
            .filter((s) => s.speciality != null)
            .filter((s) => s.speciality.role_id == user.speciality_type);
        res.send({
            user: user,
            todayBookings: todayBookings,
            weekBookings: weekBookings,
            weeklyEarning: weeklyEarning,
        });
    } else {
        res.sendStatus(406);
    }
}

async function patientInfo(req, res, next) {
    if (req.user && req.user.id) {
        var user_id = req.body.id;
        var where = { id: user_id };
        // var family = await db.user_family.findAll({ where: { user_id: user_id } });
        var user = await db.user.findOne({
            where: where,
            attributes: [
                'id', 'first_name', 'last_name', 'fullName',
                'createdAt', 'picture', 'isd_code', 'country_id', 'phone_number', 'gender',
                'dob', // [Sequelize.col('emergency_contact_person.phone'), 'emergency_contact']
            ],
            include: ["insurance", "config", 'emergency_contact_person'],
        });
        let family = [];
        family = await user.getFamilies()
            .map(r => {
                let user = JSON.parse(JSON.stringify(r.user));
                user.relation = r.relation;
                return user;
            });
        user = JSON.parse(JSON.stringify(user));
        if (user && user.config && user.config.is_no_insurance) {
            delete user.insurance;
        }
        res.send({ user: user, family: family });
    } else {
        res.sendStatus(406);
    }
}

async function transferGetOtp(req, res, next) {
    if (req.user && req.user.id) {
        var user = req.body;

        var user_id = req.body.id;
        var email = req.body.email;

        const otp = Math.floor(100000 + Math.random() * 900000);
        db.pin
            .create({ user_id: user_id, pin: otp, status: 0 })
            .then((resp) => {
                if (
                    user.user_role &&
                    (user.user_role.role_id == 1 || user.user_role.role_id == 3)
                )
                    otpTrigger(
                        "Transfer_auth_code_doctor", {
                            email: email,
                            subject: "Docty Health Care: Transfer Clinic",
                            userName: user.first_name,
                            otp: otp,
                            text: `Please use this OTP for your account transferring.`,
                        },
                        req.lang || "en"
                    );

                if (user.user_role && user.user_role.role_id == 5)
                    otpTrigger(
                        "Transfer_auth_code_clinic", {
                            email: email,
                            subject: "Docty Health Care: Transfer Clinic",
                            userName: user.first_name,
                            otp: otp,
                            text: `Please use this OTP for your clinic.`,
                        },
                        req.lang || "en"
                    );

                res.send({ success: true });
            })
            .catch((err) => {
                res.status(400).status({
                    status: false,
                    errors: `${err}`,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

// async function newBookingGetOtp(req, res, next) {
//   if (req.user && req.user.id) {
//     var user = req.body;

//     var user_id = req.body.id;
//     var email = req.body.email;

//     const otp = Math.floor(100000 + Math.random() * 900000);
//     db.pin
//       .create({ user_id: user_id, pin: otp, status: 0 })
//       .then(async (resp) => {
//         await otpTrigger(
//           "Symptom_Check_Auth_Code",
//           {
//             email: email,
//             subject: "Docty Health Care: New Booking OTP",
//             userName: user.first_name,
//             otp: otp,
//             text: `Please use this OTP for new booking authentication by agent.`,
//           },
//           req.lang || "en"
//         ).then(console.log).catch(console.log);

//         res.send({ success: true });
//       })
//       .catch((err) => {
//         res.status(400).status({
//           status: false,
//           errors: `${err}`,
//         });
//       });
//   } else {
//     res.sendStatus(406);
//   }
// }
async function newBookingGetOtp(req, res, next) {
    if (req.user && req.user.id) {
        var user = req.body;

        var user_id = req.body.id;
        var family_id = req.body.family_id || 0;

        let userObj = await db.userFamilyView.findByPk(user_id);
        let email = userObj.email;
        let phone = `${userObj.isd_code}${userObj.phone_number}`;
        let userName = userObj.first_name
        let familyObj = null
        let age = 0;
        // if (!!family_id) {
        //   familyObj = await db.user_family.findByPk(family_id);
        //   if (familyObj)
        //     age = getAge(familyObj.dob) || 0
        // }
        age = getAge(userObj.dob) || 0
        let ud = userObj.id;
        if (age >= 18) {
            email = userObj.email;
            phone = `${userObj.isd_code}${userObj.phone_number}`;
            userName = userObj.first_name
        } else {
            let parent = await db.userFamilyView.findByPk(userObj.parent);
            if (!!parent) {
                email = parent.email;
                phone = `${parent.isd_code}${parent.phone_number}`;
                userName = parent.first_name;
                family_id = userObj.id
                ud = userObj.parent;
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        db.pin.create({ user_id: ud, pin: otp, status: 0, member_id: family_id })
            .then(async(resp) => {
                var trigger = 'Symptom_Check_Auth_Code';
                if (user.isCovid19Checking) trigger = 'Covid19_Check_Auth_Code';
                if (user.isMovingClinicPatient) trigger = 'Move_Patient_Auth_Code';
                if (!!user.sendTo && user.sendTo == "phone") {
                    smsOtpTrigger(trigger, {
                            to: phone,
                            userName: userName,
                            otp: otp,
                            company_name: "Docty Admin"
                        },
                        req.lang || 'es')
                } else {
                    await otpTrigger(trigger, {
                        subject: "Docty Health Care: New Booking OTP",
                        text: `Please use this OTP for new booking authentication by agent.`,
                        email: email,
                        userName: userName,
                        otp: otp,
                        company_name: "Docty Admin"
                    }, req.lang || 'en');
                }
                res.send({ success: true });
            })
            .catch(err => {
                res.status(400).status({
                    status: false,
                    errors: `${err}`
                });
            });
    } else {
        res.sendStatus(406);
    }
}

async function verifyOtp(req, res, next) {
    if (req.user && req.user.id) {
        var user_id = req.body.user_id;
        var otp = req.body.otp;

        db.pin
            .findOne({ where: { user_id: user_id, pin: otp, status: 0 } })
            .then(async(resp) => {
                if (resp) {
                    await db.pin.update({ status: 1 }, { where: { user_id: user_id, pin: otp } });
                    res.send({ success: true });
                } else res.send({ success: false });
            })
            .catch((err) => {
                res.status(400).status({
                    status: false,
                    errors: `${err}`,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

async function oneTimeLoginToken(req, res, next) {
    if (req.user && req.user.id) {
        var super_admin = await db.credential.findOne({
            where: { key: "SuperAdmin" },
        });

        if (super_admin == null) {
            res.sendStatus(406);
            return;
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        db.pin
            .create({ user_id: 0, pin: otp, status: 0 }) //super
            .then((resp) => {
                otpTrigger(
                    "One_Time_Login_Token_Otp", { email: super_admin.value, otp: otp, userName: 'Admin' },
                    req.lang || "en"
                );
                res.send({ success: true });
            })
            .catch((err) => {
                res.status(400).status({
                    status: false,
                    errors: `${err}`,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

async function verifySuperAdminOtp(req, res, next) {
    if (req.user && req.user.id) {
        var otp = req.body.otp;

        db.pin
            .findOne({ where: { user_id: 0, pin: otp, status: 0 } })
            .then(async(resp) => {
                if (resp) {
                    await db.pin.update({ status: 1 }, { where: { user_id: 0, pin: otp } });
                    res.send({ success: true });
                } else res.send({ success: false });
            })
            .catch((err) => {
                res.status(400).status({
                    status: false,
                    errors: `${err}`,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

async function oneTimeTokenGenerate(req, res, next) {
    if (req.user && req.user.id) {
        var data = req.body;
        console.log(data);
        var hash = await generateToken({ name: data.doctor_name, group: "client", role: 2 })
        var token_expire = new Date();
        token_expire.setHours(token_expire.getHours() + 1);

        var tokenObj = await db.token.create({
            userId: data.doctor_id,
            token: hash,
            expired_at: null,
            login_as: 0,
        });
        tokenObj.update({ expiredAt: token_expire });

        var domain = await getUserDomain(data.doctor_id);
        res.send({ success: true, url: `${domain}/setup?token=${hash}` });
    } else {
        res.sendStatus(406);
    }
}

async function bulkTokenDownload(req, res, next) {
    if (req.user && req.user.id) {
        var data = req.body;

        var DB_admin = await db.credential.findOne({
            where: { key: "DownloadDB" },
        });

        if (DB_admin == null) {
            res.sendStatus(406);
            return;
        }

        var token_expire = new Date();
        token_expire.setHours(token_expire.getHours() + 1);

        var userList = await db.user.findAll({
            where: {
                status: {
                    [Op.gte]: 0
                }
            },
            include: [{
                model: db.user_role,
                attributes: ["role_id"],
                where: { role_id: data.role },
            }, ],
        });

        var csv = "Full Name,Email,Phone Number, link\n"; //default

        //get domain
        var baseDomain = config.baseDomain || "docty.ai";

        var subdomain = "";
        try {
            var roleObject = await db.role.findOne({ where: { id: data.role } });
            if (roleObject) subdomain = roleObject.role.toLowerCase() + ".";
        } catch (e) {}
        subdomain = subdomain.replace("retail clinic", "clinic");
        var domain = `https://${subdomain}${baseDomain}`;

        for (var i = 0; i < userList.length; i++) {
            var user = userList[i];

            var hash = await generateToken({ name: user.first_name, group: "client", role: data.role });
            var tokenObj = await db.token.create({
                userId: data.doctor_id,
                token: hash,
                expired_at: null,
                login_as: 0,
                is_for_link: true,
            });
            tokenObj.update({ expiredAt: token_expire });

            csv += `${user.fullName},${user.email},${user.phone_number},${domain}/setup?token=${hash}\n`;
        }

        S3UploadToFile(csv, `${new Date().getTime()}.csv`, "csv", "text/csv")
            .then(async(s3Resp) => {
                if (s3Resp.Location) {
                    otpTrigger("BULK_LOGIN_TOKEN_CSV", {
                        email: DB_admin.value,
                        link: s3Resp.Location,
                    });
                    res.send({ success: true });
                    return;
                }
                res.sendStatus(406);
            })
            .catch((err) =>
                res.status(400).send({
                    status: false,
                    errors: `${err}`,
                })
            );
    } else {
        res.sendStatus(406);
    }
}

async function transferDoctor(req, res, next) {
    if (req.user && req.user.id) {
        var data = req.body;
        console.log(data);
        await db.associate.destroy({ where: { associate: data.doctor_id } });
        db.associate
            .create({ user_id: data.clinic_id, associate: data.doctor_id })
            .then(() => {
                crmTrigger(
                    "Transfer_completed_doctor", {
                        email: data.doctor_email,
                        subject: "Docty Health Care: Transfer Complete",
                        doctor: data.doctor_email,
                        clinic: data.clinic_email,
                        remarks: data.transfer_remarks,
                    },
                    req.lang || "en"
                );
                crmTrigger(
                    "Transfer_completed_clinic", {
                        email: data.clinic_email,
                        subject: "Docty Health Care: Transfer Complete",
                        doctor: data.doctor_email,
                        clinic: data.clinic_email,
                        remarks: data.transfer_remarks,
                    },
                    req.lang || "en"
                );

                res.send({ success: true });
            })
            .catch((err) => {
                res.status(400).status({
                    status: false,
                    errors: `${err}`,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

async function transferPatient(req, res, next) {
    if (req.user && req.user.id) {
        var data = req.body;
        let oldCompanyRole = null;
        console.log(data);
        var clinic = await db.user.findByPk(data.clinic_id, {
            include: ["user_role"],
        });
        var patient = await db.user.findByPk(data.patient_id);
        let inst = null;

        if (clinic.user_role.role_id == 13) {
            let sql = `SELECT c.* FROM customers c,user_roles ur 
                  WHERE c.user_id = ur.user_id AND ur.role_id = 13 AND c.customer = ${data.patient_id}`;
            let crpt = await db.sequelize.query(sql).spread((r, m) => r[0]);
            if (!!crpt) {
                inst = db.customer.update({ user_id: clinic.id }, { where: { id: crpt.id } }).then(r => { console.log(r); return r; });
            } else {
                inst = db.customer.create({ user_id: clinic.id, customer: data.patient_id });
            }

        } else {
            inst = db.customer.findOrCreate({
                where: {
                    user_id: clinic.id,
                    customer: data.patient_id,
                }
            });
            await db.health_advisor.update({ isDefault: false }, { where: { patient_id: data.patient_id } });
            await db.health_advisor.findOrCreate({
                where: {
                    patient_id: data.patient_id,
                    clinic_id: clinic.id
                }
            }).then(rr => rr[0].update({ approved: true, family_access: true, isDefault: true }));
        }

        inst
        // .update({ user_id: clinic.id })
            .then(async(resp) => {
                if (!!patient.email) {
                    crmTrigger(
                        "Transfer_completed_patient", {
                            email: patient.email,
                            subject: "Docty Health Care: Transfer Complete",
                            clinic: clinic.company_name,
                            remarks: data.transfer_remarks,
                        },
                        req.lang || "en"
                    );
                }
                crmTrigger(
                    "Transfer_patient_completed_clinic", {
                        email: clinic.email,
                        subject: "Docty Health Care: Transfer Complete",
                        patient: patient.email || patient.fullName,
                        remarks: data.transfer_remarks,
                    },
                    req.lang || "en"
                );
                res.send({ success: true });
            })
            .catch((err) => {
                res.status(400).status({
                    status: false,
                    errors: `${err}`,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

// clinic 's doctor(nurse) -> independent doctor(nurse)
async function transferDoctorToDocty(req, res, next) {
    if (req.user && req.user.id) {
        var data = req.body;
        var clinic = await db.user.findByPk(data.clinic_id);
        var staff = await db.user.findByPk(data.doctor_id);

        db.associate
            .destroy({ where: { associate: data.doctor_id } })
            .then((resp) => {
                crmTrigger(
                    "Moved_to_docty_doctor", {
                        email: staff.email,
                        clinic: clinic.company_name,
                        remarks: data.transfer_remarks,
                    },
                    staff.lang || req.lang || "en"
                );
                crmTrigger(
                    "Moved_your_staff_to_docty", {
                        email: clinic.email,
                        staff_name: staff.email,
                        remarks: data.transfer_remarks,
                    },
                    clinic.lang || req.lang || "en"
                );
                res.send({ success: true });
            })
            .catch((err) => {
                res.status(400).status({
                    status: false,
                    errors: `${err}`,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

// clinic 's patient -> independent patient(docty patient)
async function transferPatientToDocty(req, res, next) {
    if (req.user && req.user.id) {
        var data = req.body;
        var clinic = await db.user.findByPk(data.clinic_id);
        var patient = await db.user.findByPk(data.patient_id);

        db.customer
            .destroy({ where: { customer: data.patient_id } })
            .then((resp) => {
                crmTrigger(
                    "Moved_to_docty_patient", {
                        email: patient.email,
                        clinic: clinic.company_name,
                        remarks: data.transfer_remarks,
                    },
                    patient.lang || req.lang || "en"
                );
                crmTrigger(
                    "Moved_your_patient_to_docty", {
                        email: clinic.email,
                        patient: patient.email,
                        remarks: data.transfer_remarks,
                    },
                    clinic.lang || req.lang || "en"
                );
                res.send({ success: true });
            })
            .catch((err) => {
                res.status(400).status({
                    status: false,
                    errors: `${err}`,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

async function changePassword(req, res, next) {
    if (!req.user || !req.user.id) {
        return res.status(400).send({
            status: false,
        });
    }
    try {
        let data = req.body;

        let user = await db.admin.findOne({
            where: { id: req.user.id },
            attributes: ["password"],
        });

        // var isMatch = await bcrypt.compare(data.currentPassword, user.password);
        // console.log(isMatch)
        // if (!isMatch) {
        //   return res.status(400).send({
        //     message: 'Please check your current password.',
        //     status: false
        //   });
        // }
        bcrypt.genSalt(10, async function(err, salt) {
            if (err) throw err;

            bcrypt.hash(data.password, salt, async function(err, newPassword) {
                if (err) throw err;
                let user = await db.admin.findByPk(req.user.id);
                await db.admin.update({ password: newPassword, need_password_reset: false }, { where: { id: req.user.id } });
                crmTrigger(
                    "Password_Reset_Confirmation", {
                        email: user.email,
                        userName: user.fullName,
                        password: data.password,
                        time: timeFormat(new Date(), user.timezone_offset),
                    },
                    user.lang || req.lang || "en"
                );
                res.status(200).json({
                    errors: false,
                    status: true,
                    message: "Successfully updated new password",
                });
            });
        });
    } catch (e) {
        res.status(200).json({
            errors: e,
            status: false,
            message: "Error",
        });
    }
}

async function getUserConfig(req, res, next) {
    if (req.user && req.user.id) {
        var user_id = req.user.id;
        if (req.query && req.query.user_id) user_id = req.query.user_id;

        var where = { user_id: user_id, member_id: 0 };
        if (req.query && req.query.member_id) where.member_id = req.query.member_id;
        db.user_config
            .findOne({ where: where })
            .then((resp) => {
                res.send(resp);
            })
            .catch((err) => {
                res.status(404).json({
                    error: true,
                    status: false,
                    errors: `${err}`,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

async function updateUserConfig(req, res, next) {
    if (req.user && req.user.id) {
        var data = req.body;
        if (!!!data["member_id"]) data["member_id"] = 0;
        var where = { user_id: data.user_id };
        if (data["member_id"] != null) where.member_id = data.member_id;

        db.user_config
            .findOrCreate({ where: where })
            .then((resp) => {
                resp[0]
                    .update(data)
                    .then((resp2) => res.send(resp2))
                    .catch((err) => {
                        throw err;
                    });
            })
            .catch((err) => {
                res.status(404).json({
                    error: true,
                    status: false,
                    errors: `${err}`,
                });
            });
    } else {
        res.sendStatus(406);
    }
}

var daysOfDiff = (listOfdata) => {
    var loginDays = 0;
    if (listOfdata.length > 1) {
        loginDays =
            new Date(listOfdata[0]).getTime() - new Date(listOfdata[1]).getTime();
    } else if (listOfdata.length == 1) {
        loginDays = new Date().getTime() - new Date(listOfdata[0]).getTime();
    }
    loginDays = Math.round(loginDays / (1000 * 60 * 60 * 24));
    return loginDays;
};

async function timeLog(req, res, next) {
    if (req.user && req.user.id) {
        var user_id = req.params.user_id;

        var activity_logs = await db.activity_log.findAll({
            where: {
                user_id: user_id,
            },
            limit: 2,
            order: [
                ["createdAt", "DESC"]
            ],
        });
        activity_logs = activity_logs.map((a) => a.createdAt);
        var loginDays = daysOfDiff(activity_logs);

        var symptom_analysis = await db.symptom_analysis.findAll({
            where: {
                user_id: user_id,
            },
            limit: 2,
            order: [
                ["createdAt", "DESC"]
            ],
        });
        symptom_analysis = symptom_analysis.map((a) => a.createdAt);
        var symptomDays = daysOfDiff(symptom_analysis);

        var books = await db.booking.findAll({
            where: {
                patient_id: user_id,
                status: 3, //complete
                family_member_id: 0,
            },
            limit: 2,
            order: [
                [{
                        model: db.schedule,
                        as: "schedule",
                    },
                    "start",
                    "DESC",
                ],
            ],
            include: [{
                model: db.schedule,
                as: "schedule",
                required: true,
            }, ],
        });
        books = books.map((b) => b.schedule.start);
        var bookingDays = daysOfDiff(books);
        res.send({
            loginDays,
            symptomDays,
            bookingDays,
        });
    } else {
        res.sendStatus(406);
    }
}

module.exports = {
    userRegistration,
    login,
    validatePin,
    checkUniqueField,
    updateUserProfile,
    resetPassword,
    resetTemporaryPassword,
    changePassword,
    userInfo,
    updateUserInfo,
    getUserAvailability,
    addUserSkill,
    removeUserSkill,
    skills,
    getUserServices,
    skill,
    resendOtp,
    getUsers,
    getUsersEx,
    staffWithScheduleOfClinic,
    downloadCSV,
    updateSignature,
    updateAvailableStatus,
    clinicInfo,
    staffListOfClinic,
    patientListOfClinic,
    doctorInfo,
    patientInfo,
    newBookingGetOtp,
    transferGetOtp,
    verifyOtp,
    transferDoctor,
    transferDoctorToDocty,
    transferPatient,
    transferPatientToDocty,
    oneTimeLoginToken,
    verifySuperAdminOtp,
    oneTimeTokenGenerate,
    bulkTokenDownload,
    unlockUserProfile,
    getUserConfig,
    updateUserConfig,
    timeLog,
};