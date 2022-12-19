const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { crmTrigger, otpTrigger } = require('../../commons/crmTrigger');
var json2xls = require('json2xls');
var path = require('path');
var xlsx = require('node-xlsx');

module.exports = {
    async addTrigger(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            let v = Date.now();
            let str = v.toString(16);
            data.identification = str.toUpperCase();
            try {
                data.name = data.name.replace(/ /g, '_');
                var trigger = await db.email_trigger.findOne({ where: { name: { [Op.like]: data.name } } })
                if (trigger != null) {
                    throw 'Already Exist Trigger'
                }
                let resp = await db.email_trigger.create(data);
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

    },
    async updateTrigger(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                data.name = data.name.replace(/ /g, '_');
                var where = { name: { [Op.like]: data.name } };
                if (data.id) {
                    where.id = { [Op.ne]: data.id }
                }
                var trigger = await db.email_trigger.findOne({ where: where })
                if (trigger != null) {
                    throw `"${data.name}" already exist`
                }
                let resp = await db.email_trigger.upsert(data);
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

    },
    async updateTriggerPushNotification(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                await db.email_trigger_notification.destroy({ where: { trigger_id: data.trigger_id } });
                let resp = await db.email_trigger_notification.upsert(data);
                res.send({
                    status: true,
                    data: resp
                });
            } catch (error) {
                console.log(error)
                res.status(400).send({
                    status: false,
                    errors: error
                });
            }
        } else {
            res.sendStatus(406);
        }

    },
    async removeTriggerPushNotification(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                var resp = await db.email_trigger_notification.destroy({ where: { trigger_id: data.trigger_id } });
                res.send({
                    status: true,
                    data: resp
                });
            } catch (error) {
                console.log(error)
                res.status(400).send({
                    status: false,
                    errors: error
                });
            }
        } else {
            res.sendStatus(406);
        }

    },
    async updateTriggerMonitorNotification(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                await db.email_trigger_monitor_notification.destroy({ where: { trigger_id: data.trigger_id } });
                let resp = await db.email_trigger_monitor_notification.upsert(data);
                console.log(data)
                res.send({
                    status: true,
                    data: resp
                });
            } catch (error) {
                console.log(error)
                res.status(400).send({
                    status: false,
                    errors: error
                });
            }
        } else {
            res.sendStatus(406);
        }

    },
    async removeTriggerMonitorNotification(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                var resp = await db.email_trigger_monitor_notification.destroy({ where: { trigger_id: data.trigger_id } });
                res.send({
                    status: true,
                    data: resp
                });
            } catch (error) {
                console.log(error)
                res.status(400).send({
                    status: false,
                    errors: error
                });
            }
        } else {
            res.sendStatus(406);
        }

    },
    async deleteTrigger(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                let resp = await db.email_trigger.destroy({ where: { id: data.id } });
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

    },
    async testTrigger(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                var email = data.email;
                var trigger = data.trigger;
                var triggerName = trigger.name;
                var triggerData = { email: email, subject: `Test Trigger - ${triggerName}` };
                switch (triggerName) {
                    case 'Associate_New_Admin':
                        triggerData = { email: email, subject: 'Docty Health Care: portal Access', password: "${password}", byname: "${byname}" };
                        break;
                    case 'Covid19_New_User_Email':
                        triggerData = { email: email, subject: 'Docty Health Care: portal Access', password: "${password}", byname: "${byname}" };
                        break;
                    case 'Access_Allowed_Family_Member':
                        triggerData = { email: email, subject: 'Docty Health Care: portal Access', password: "${password}" };
                        break;
                    case 'New_Family_member_Added':
                        triggerData = { email: email, subject: 'Docty Health Care: New Family Member Added', family_name: "${family_name}", relation: "${relation}" };
                        break;
                    case 'OTP':
                        triggerData = { email: email, subject: 'Docty Health Care: One Time Password', userName: "${userName}", otp: "${otp}", text: `Please use this OTP for your account verification.` };
                        break;
                    case 'Consultation_Request_Invoice_Patient':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Invoice', your_name: "${patient.fullName}", provider_name: "${provider.fullName}", type: "${councelling_type}", time: "${time}", link: "${link}" };
                        break;
                    case 'Reviewer_Assigned':
                        triggerData = { email: email, subject: 'Docty Health Care: Profile Reviewer Assigned', reviewer: "${reviewer}", userName: "${userName}" };
                        break;
                    case 'New_Lead_Assigned':
                        triggerData = { email: email, subject: 'Docty Health Care: New Lead Assigned', user: "${user}", userName: "${userName}" };
                        break;
                    case 'Consultation_Request_Received':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Request', your_name: "${your_name}", patient_name: "${patient_name}", type: "${councelling_type}", time: "${time}", link: "${link}" };
                        break;
                    case 'Consultation_Request_Sent':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Request', your_name: "${your_name}", patient_name: "${patient_name}", type: "${councelling_type}", time: "${time}", link: "${link}" };
                        break;
                    case 'Consultation_Schedule_Transfer_Patient':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Schedule Transfer', your_name: "${your_name}", provider_name: "${provider_name}", support_name: "${support_name}", type: "${councelling_type}", old_time: "${old_time}", link: "${link}" };
                        break;
                    case 'Consultation_Schedule_Transfer_Provider':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Schedule Transfer', your_name: "${your_name}", patient_name: "${patient_name}", support_name: "${support_name}", type: "${councelling_type}", old_time: "${old_time}", link: "${link}" };
                        break;
                    case 'New_Doctor_Signup':
                        triggerData = { email: email, subject: 'Docty Health Care: One Time Password', userName: "${userName}", otp: "${otp}", text: `Please use this OTP for your account verification.` };
                        break;
                    case 'New_Patient_Signup':
                        triggerData = { email: email, subject: 'Docty Health Care: One Time Password', userName: "${userName}", otp: "${otp}", text: `Please use this OTP for your account verification.` };
                        break;
                    case 'New_Nurse_Signup':
                        triggerData = { email: email, subject: 'Docty Health Care: One Time Password', userName: "${userName}", otp: "${otp}", text: `Please use this OTP for your account verification.` };
                        break;
                    case 'New_Lab_Signup':
                        triggerData = { email: email, subject: 'Docty Health Care: One Time Password', userName: "${userName}", otp: "${otp}", text: `Please use this OTP for your account verification.` };
                        break;
                    case 'New_Clinic_Signup':
                        triggerData = { email: email, subject: 'Docty Health Care: One Time Password', userName: "${userName}", otp: "${otp}", text: `Please use this OTP for your account verification.` };
                        break;
                    case 'New_Pharmacy_Signup':
                        triggerData = { email: email, subject: 'Docty Health Care: One Time Password', userName: "${userName}", otp: "${otp}", text: `Please use this OTP for your account verification.` };
                        break;
                    case 'Login_Details_Generated':
                        triggerData = { email: email, password: "${password}", link: '${link}' };
                        break;
                    case 'Transfer_auth_code_doctor':
                        triggerData = { email: email, subject: 'Docty Health Care: Transfer Clinic', userName: "${userName}", otp: "${otp}", text: `Please use this OTP for your account transferring.` };
                        break;
                    case 'Transfer_auth_code_clinic':
                        triggerData = { email: email, subject: 'Docty Health Care: Transfer Clinic', userName: "${userName}", otp: "${otp}", text: `Please use this OTP for your clinic.` };
                        break;
                    case 'Symptom_Check_Auth_Code':
                        triggerData = { email: email, subject: 'Docty Health Care: New Booking OTP', userName: "${userName}", otp: "${otp}", text: `Please use this OTP for new booking authentication by agent.` };
                        break;
                    case 'Transfer_completed_doctor':
                        triggerData = { email: email, subject: 'Docty Health Care: Transfer Complete', doctor: "${doctor}", clinic: "${clinic}", remarks: "${remarks}" };
                        break;
                    case 'Transfer_completed_clinic':
                        triggerData = { email: email, subject: 'Docty Health Care: Transfer Complete', doctor: "${doctor}", clinic: "${clinic}", remarks: "${remarks}" };
                        break;
                    case 'Reviewer_Activated_Account':
                    case 'Reviewer_Activated_Account_Doctor':
                    case 'Reviewer_Activated_Account_Nurse':
                    case 'Reviewer_Activated_Account_Lab':
                    case 'Reviewer_Activated_Account_Clinic':
                    case 'Reviewer_Activated_Account_Pharmacy':
                        triggerData = { email: email, userName: "${fullName}", reviewer: "${reviewer}" };
                        break;
                    case 'Consultation_Request_Reject_By_Clinic_Provider':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Schedule Transfer', your_name: "${your_name}", patient_name: "${patient_name}", type: "${councelling_type}", time: "${time}", support_name: "${support_name}", link: "${link}" };
                        break;
                    case 'Consultation_Request_Reject_By_Clinic_Patient':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Schedule Transfer', your_name: "${your_name}", provider_name: "${provider_name}", type: "${councelling_type}", time: "${time}", support_name: "${support_name}", link: "${link}" };
                        break;
                    case 'New_Prescription':
                        triggerData = { email: email, subject: 'New Prescription', patient_name: "${patient_name}", patient_gender: "${patient_gender}", patient_age: "${patient_age}", patient_national_id: "${patient_national_id}", provider_signature: "${provider_signature}", provider_name: "${provider_name}", provider_national_id: "${provider_national_id}", provider_speciality: "${provider_speciality}", pdfLink: "${pdfLink}", };
                        break;
                    case 'New_staff_Enrolled':
                        triggerData = { email: email, subject: 'Docty Health Care: portal Access', password: "${password}", userName: "${userName}" };
                        break;
                    case 'Associate_New_User':
                        triggerData = { email: email, subject: 'Docty Health Care: portal Access', password: "${password}" };
                        break;
                    case 'Password_Reset_Confirmation':
                        triggerData = { email: email, subject: 'Docty Health Care: Password reset confirmation', password: "${password}", time: "${time}" };
                        break;
                    case 'Password_Reset_Successfull':
                        triggerData = { email: email };
                        break;
                    case 'Prescription_Invoice_Created':
                        triggerData = { email: email, subject: 'Docty Health Care: Prescription invoice created', your_name: "${your_name}", pharmacy_name: "${pharmacy_name}", doctor_name: "${doctor_name}", link: "${link}", invoice_detail: "${invoice_detail}" };
                        break;
                    case 'Prescription_Package':
                        triggerData = { email: email, subject: 'Docty Health Care: Prescription package', your_name: "${your_name}", pharmacy_name: "${pharmacy_name}", doctor_name: "${doctor_name}", message: "${message}" };
                        break;
                    case 'Consultation_Schedule_Update_Request_Received':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Schedule Update Request', your_name: "${your_name}", provider_name: "${provider_name}", type: "${councelling_type}", old_time: "${old_time}", link: "${link}" };
                        break;
                    case 'Consultation_Request_Accepted':
                        triggerData = {
                            email: email,
                            consultation_id: '${value}', your_name: '${value}',
                            patient_name: '${value}', patient_picture: '${value}',
                            provider_name: '${value}', provider_picture: '${value}',
                            type: '${value}', time: '${value}', remarks: '${value}', consultation_details_link: '${value}',
                        };
                        break;
                    case 'Patient_Accepted_Change':
                        triggerData = {
                            email: email,
                            consultation_id: '${value}', your_name: '${value}',
                            patient_name: '${value}', patient_picture: '${value}',
                            provider_name: '${value}', provider_picture: '${value}',
                            type: '${value}', old_time: '${value}', new_slot_1: '${value}', new_slot_2: '${value}', remarks: '${value}', consultation_details_link: '${value}',
                        };
                        break;
                    case 'Patient_Reminder_1':
                    case 'Patient_Reminder_2':
                    case 'Provider_offline':
                        triggerData = {
                            email: email,
                            consultation_id: '${value}', your_name: '${value}',
                            patient_name: '${value}', patient_picture: '${value}',
                            provider_name: '${value}', provider_picture: '${value}',
                            type: '${value}', date_time: '${value}', remarks: '${value}', consultation_details_link: '${value}',
                        };
                        break;
                    case 'Consultation_Request_Rejected':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Request Reject', your_name: "${your_name}", provider_name: "${provider_name}", type: "${councelling_type}", time: "${time}", link: "${link}", rejected_remarks: "${rejected_remarks}" };
                        break;
                    case 'You_Signed_Contract':
                        triggerData = { email: email, subject: 'Docty Health Care: You Signed Contract', userName: "${userName}", pdfLink: "${pdfLink}" };
                        break;
                    case 'Staff_Signed_Contract':
                        triggerData = { email: email, subject: 'Docty Health Care: You Signed Contract', company: "${company}", staff: "${staff}", pdfLink: "${pdfLink}" };
                        break;
                    case 'Notify_Unreachable':
                        triggerData = { email: email, subject: 'Docty Health Care: Notify Unreachable', userName: "${userName}", providerName: "${providerName}", type: "${councelling_type}", time: "${time}", link: "${link}" };
                        break;
                    case 'Pending_Staff_Signup':
                        triggerData = { email: email, subject: 'Docty Health Care: Pending Signup', userName: "${userName}", password: "${password}" };
                        break;
                    case 'Provider_Waiting':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Provider Waiting', your_name: "${your_name}", patient_name: "${patient_name}", type: "${councelling_type}", time: "${time}", link: "${link}" };
                        break;
                    case 'Consultation_Reminder_1':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Upcomming in 10 minutes', your_name: "${your_name}", patient_name: "${patient_name}", type: "${councelling_type}", time: "${time}", link: "${link}" };
                        break;
                    case 'Consultation_Reminder_2':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Upcomming in 5 minutes', your_name: "${your_name}", patient_name: "${patient_name}", type: "${councelling_type}", time: "${time}", link: "${link}" };
                        break;
                    case 'Consultation_Schedule_Update_Request_Accept_Patient':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Schedule Update Request Accept', your_name: "${your_name}", provider_name: "${provider_name}", type: "${councelling_type}", time: "${time}", link: "${link}" };
                        break;
                    case 'Consultation_Schedule_Update_Request_Accept_Provider':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Schedule Update Request Accept', your_name: "${your_name}", patient_name: "${patient_name}", type: "${councelling_type}", time: "${time}", link: "${link}" };
                        break;
                    case 'Consultation_Request_Canceled_Patient':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Canceled', your_name: "${your_name}", provider_name: "${provider_name}", type: "${councelling_type}", time: "${time}", link: "${link}" };
                        break;
                    case 'Consultation_Request_Canceled_Provider':
                        triggerData = { email: email, subject: 'Docty Health Care: Consultation Canceled', your_name: "${your_name}", patient_name: "${patient_name}", type: "${councelling_type}", time: "${time}", link: "${link}" };
                        break;
                    case 'Message':
                        triggerData = { email: email, subject: 'Docty Health Care: Message', receiver: "${receiver}", sender: "${sender}", message: "${message)" };
                        break;
                    // otp trigger
                    case 'Family_Consultation_Authcode':
                        triggerData = { email: email, subject: 'Docty Health Care: One Time Password', userName: "${userName}", otp: "${otp}", text: `Please use this OTP for your account verification.` };
                        break;
                    case 'Forgot_Password':
                        triggerData = { email: email, otp: "${otp}", webUrl: "${webUrl}", userName: "${userName}", subject: 'Password reset otp' };
                        break;
                    case 'Happy_birthday':
                        triggerData = { email: email, user_name: '${user_name}', user_photo: '${user_photo}', dob: '${dob}' };
                        break;
                    case 'incorporation_greeting':
                        triggerData = { email: email, organization_name: '${organization_name}', organization_photo: '${organization_photo}', incorporation_date: '${incorporation_date}' };
                        break;
                    case 'Insurance_expires_soon_30day':
                    case 'Insurance_expires_soon_10day':
                    case 'Insurance_expires_soon_5day':
                    case 'Insurance_expires_soon_4day':
                    case 'Insurance_expires_soon_3day':
                    case 'Insurance_expires_soon_2day':
                    case 'Insurance_expires_today':
                        triggerData = { email: email, user_name: '${user_name}', insurance_company: '${insurance_company}', insurance_number: '${insurance_number}', insurance_copy_file: '${insurance_copy_file}', expiry_date: '${expiry_date}' };
                        break;
                    case 'Provider_Patient_Added':
                        triggerData = { email: email, user_id: '${user_id}', password: '${password}', invited_by: '${invited_by}', user_name: '${user_name}' };
                        break;
                    case 'New_Patient_Added':
                        triggerData = { email: email, patient_name: '${patient_name}', patient_email: '${patient_email}' };
                        break;
                    case 'Patient_Checked_in':
                        triggerData = { email: email, patient_name: '${patient_name}', patient_photo: '${patient_photo}', patient_email: '${patient_email}' };
                        break;
                    case 'Patient_activated':
                        triggerData = { email: email, patient_name: '${value}', patient_photo: '${value}', patient_email: '${value}' };
                        break;
                    case 'staff_Checked_in':
                        triggerData = { email: email, company: '${value}', staff_name: '${value}', staff_email: '${value}', staff_photo: '${value}', staff_contact_pdf_link: '${value}', staff_profile_link: '${value}' };
                        break;
                    case 'staff_reviwer_assigned':
                        triggerData = { email: email, staff_name: '${value}', staff_photo: '${value}', reviewer_name: '${value}', reviewer_photo: '${value}', staff_email: '${value}', staff_profile_link: '${value}' };
                        break;
                    case 'staff_reviewer_checked_profile':
                        triggerData = { email: email, userName: '${value}', remarks: '${value}', reviewerEmail: '${value}', reviewerName: '${value}', reviewer_picture: '${value}', national_id_status: ' - ', license_status: ' - ', practice_status: ' - ', service_status: ' - ' };
                        break;
                    case 'staff_reviewer_approved_profile':
                        triggerData = { email: email, Staff_name: '${value}', staff_photo: '${value}', reviewer_name: '${value}', reviewer_photo: '${value}', staff_email: '${value}', staff_profile_link: '${value}' };
                        break;
                    case 'New_Video_Consultation_Request':
                    case 'New_HomeCare_Consultation_Request':
                    case 'New_Retail_Consultation_Request':
                        triggerData = { email: email, requested_by: '${value}', requested_for: '${value}', provider_name: '${value}', provider_photo: '${value}', consultation_type: '${value}', consultation_time: '${value}', consultation_status: '${value}', link: '${value}', patient_age: '${value}', patient_name: '${value}', patient_gender: '${value}', patient_remarks: '${value}' };
                        break;
                    case 'Video_Consultation_Requested':
                    case 'HomeCare_Consultation_Requested':
                    case 'Retail_Consultation_Requested':
                        triggerData = { email: email, requested_by: '${value}', requested_for: '${value}', provider_name: '${value}', provider_photo: '${value}', consultation_type: '${value}', consultation_time: '${value}', consultation_status: '${value}', link: '${value}', patient_age: '${value}', patient_name: '${value}', patient_gender: '${value}', patient_remarks: '${value}' };
                        break;
                    case 'Clinic_Suspends_Staff_Account':
                        triggerData = { email: email, user_name: '${value}', by_name: '${value}', suspend_remarks: '${value}' };
                        break;
                    case 'Support_Suspends_Provider_Account':
                        triggerData = { email: email, user_name: '${value}', by_name: '${value}', suspend_remarks: '${value}' };
                        break;
                    case 'Patient_Cancelled_Booking':
                        triggerData = {
                            email: email, consultation_id: '${value}',
                            provider_name: '${value}', patient_name: '${value}', type: '${value}',
                            time: '${value}', provider_photo: '${value}', patient_photo: '${value}',
                            consultation_details_link: '${value}', remarks: '${value}'
                        };
                        break;
                    case 'Provider_Requested_Change':
                        triggerData = {
                            email: email, consultation_id: '${value}',
                            provider_name: '${value}', patient_name: '${value}', type: '${value}',
                            old_time: '${value}', provider_photo: '${value}', patient_photo: '${value}',
                            consultation_details_link: '${value}', reason: '${value}',
                            new_time1: '${value}',
                            new_time2: '${value}',
                        };
                        break;
                    case 'Empty_Calender':
                        triggerData = { email: email, provider_name: '${value}', provider_photo: '${value}' };
                        break;
                }
                otpTrigger(triggerName, triggerData, req.lang);

                res.send({
                    status: true
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

    },
    async triggers(req, res, next) {
        if (req.user && req.user.id) {
            db.email_trigger.findAll({}).then(resp => {
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
    },
    async triggers_email(req, res, next) {
        if (req.user && req.user.id) {
            db.email_trigger.findAll({
                include: [
                    {
                        model: db.email_template,
                        as: 'template',
                        attributes: ['id', 'language', 'title'],
                        where: { user_id: 0 },
                        required: false
                    }
                ]
            }).then(resp => {
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
    },
    async triggers_push(req, res, next) {
        if (req.user && req.user.id) {
            db.email_trigger.findAll({
                include: [
                    {
                        model: db.email_trigger_notification,
                        as: 'notification',
                        required: true,
                    },
                ]
            }).then(resp => {
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
    },
    async triggers_monitor_notification(req, res, next) {
        if (req.user && req.user.id) {
            db.email_trigger.findAll({
                include: [
                    {
                        model: db.email_trigger_monitor_notification,
                        as: 'monitor_notification',
                        required: true,
                    },
                ]
            }).then(resp => {
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
    },
    async trigger(req, res, next) {
        if (req.user && req.user.id) {
            db.email_trigger.findByPk(req.params.id).then(resp => {
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
    },
    async triggerExport(req, res, next) {
        res.setHeader('Content-disposition', 'attachment; filename=trigger.xlsx');
        res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.charset = 'UTF-8';

        var t = await db.email_trigger.findAll({ include: ['template'] });

        var totalData = [['Trigger', 'Mapped Template', 'Template URL', 'Description', 'Shortcodes']];
        for (var i = 0; i < t.length; i++) {
            var trigger = t[i];
            var template = trigger.template || [];

            var row = [trigger.name, template.map(t => `{{${t.title}}}`).join(), template.map(t => `{{https://cms.docty.ai/email-template/view/${t.id}}}`).join(), trigger.description, (trigger.shortcodes || []).join(',')];
            totalData.push(row);
        }
        var buffer = xlsx.build([{ name: "trigger", data: totalData }]);
        res.write(buffer);

        res.end();
        // var json = {
        //     foo: 'bar',
        //     qux: 'moo',
        //     poo: 123,
        //     stux: new Date()
        // }
        // // let json = t.map(e => {
        // //     var template = e.template || []
        // //     return {
        // //         Trigger: e.name,
        // //         'Mapped Template': template.map(t => t.title).join(),
        // //         'Template URL': `https://cms.docty.ai/email-template/view/${e.id}`,
        // //         Description: e.description
        // //     }
        // // })

        // var file = await json2xls(json);
        // // res.xls('data.xlsx', json);
        // await fs.writeFileSync('public/data.xlsx', file, 'binary');

        // const file1 = path.resolve(__dirname, `../../public/data.xlsx`);
        // //No need for special headers
        // res.download(file1);
        // // res.send(xls);
    }
};