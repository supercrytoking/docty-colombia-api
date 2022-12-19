const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const moment = require('moment');


var main = async () => {
    try {
        var CLINIC_LIST = ['Yorin Clinic', 'Test Clinic'];
        var whiteClinicList = await db.user.findAll({
            where: {
                company_name: {
                    [Op.in]: CLINIC_LIST
                }
            },
            include: [
                { model: db.user_role, where: { role_id: 5 } },
                { model: db.associate, as: 'staff', required: false }
            ]
        });
        // whiteClinicList = JSON.parse(JSON.stringify(whiteClinicList));
        console.log(whiteClinicList);
        var userIDList = [];
        whiteClinicList.forEach(clinic => {
            userIDList.push(clinic.id);
            (clinic.staff || []).forEach(doctor => {
                userIDList.push(doctor.id);
            })
        });
        console.log(userIDList);

        await db.activity_log.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // activity_log_template.destroy({ where: { user_id: { [Op.notIn]: userIDList } } }); // no user relation
        // activity_log_trigger.destroy({ where: { user_id: { [Op.notIn]: userIDList } } }); // no user relation
        await db.address.destroy({ where: { user_id: { [Op.notIn]: userIDList }, admin_id: { [Op.eq]: null } } });
        // admin.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.admin_token.destroy({ where: {} });
        // allergy.destroy({ where: { user_id: { [Op.notIn]: userIDList } } }); // no user relation
        await db.approval_review.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // app_authentications.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.associate.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // billing.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        db.prescription.destroy({ where: {} });
        db.prescription_invoice.destroy({ where: {} });
        db.booking.destroy({ where: {} });
        await db.booking_support.destroy({ where: {} });
        await db.booking_update_request.destroy({ where: {} });
        await db.booking_update_schedule.destroy({ where: {} });
        await db.call.destroy({ where: {} });
        await db.call_notification.destroy({ where: {} });
        // chronic_condition.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // city.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        await db.company_service.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // consultation_type.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // consultation_type_detail.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // contract.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // contractType.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // contract_template.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        await db.contract_track.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.councelling.destroy({ where: { provider_id: { [Op.notIn]: userIDList } } });
        await db.counselling_document.destroy({ where: {} });

        // counselling_type.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // country.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        await db.coupon_history.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.coupon_utilisation.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.covid_checker.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // credential.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        await db.customer.destroy({ where: {} });
        // department.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // diagnostic.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // documenttype.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // dropdown.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // dropdown_types.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // educationcategory.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // educationcontent.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // educationtype.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // emailtemplate.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // email_automation.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.email_conversation.destroy({ where: {} }); // ? this is not used
        // email_shortcode.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // email_trigger.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // ethnicitytype.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        await db.family_document.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.family_medical.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.favorit_procedure.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // file_manager.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        await db.gps_location.destroy({ where: {} });// ? this is no neccessory, yet, this is no used
        await db.gps_track.destroy({ where: {} });
        await db.health_advisor.destroy({ where: {} });
        await db.insurance_associate.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // insurence_benifit.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // insurence_provides.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        await db.invoice.destroy({ where: { from_id: { [Op.notIn]: userIDList } } });

        await db.location_open_time.destroy({
            where: {},
            include: [{ model: db.location, as: 'located_at', where: { user_id: { [Op.notIn]: userIDList } } },]
        });
        await db.location.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });

        await db.location_open.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });

        // medical_condition.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // medication.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // medication_condition.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // medication_duration.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // medication_slot.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // medication_type.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // medicine.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // medicine_dose_type.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.message_log.destroy({ where: {} });
        await db.message_reference.destroy({ where: {} });
        await db.my_favorite.destroy({ where: {} });
        await db.notification_subscription.destroy({ where: {} });
        await db.offer.destroy({ where: {} });
        // permission.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.pin.destroy({ where: {} });

        // pricing.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });// no user relation
        // procedure.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.professional_detail.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // professiontype.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.queue.destroy({ where: {} });
        await db.rating_summary.destroy({ where: {} });
        // relationshiptype.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.review.destroy({ where: {} });
        await db.risk_insurance_provider.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // role.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // role_permission.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.schedule.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // section.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // service.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.signedContract.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // slider.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // slot.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // sms_automations.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // sms_shortcodes.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // sms_templates.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // sms_triggers.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // speciality.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // state.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // static-page-type.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // static_pages.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // surgery.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // survey.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.survey_response.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.symptom_analysis.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.symptom_analysis_clinic.destroy({ where: { clinic_id: { [Op.notIn]: userIDList } } });
        await db.symptom_history.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.patient_symptom_interview.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.token.destroy({ where: {} });
        // translation.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user.destroy({ where: { id: { [Op.notIn]: userIDList } } });
        await db.user_authenticator.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_availability.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_charge.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_close_reason.destroy({ where: {} });
        await db.user_config.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_contract.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_department.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_department_location.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_document.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_education.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_family.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_insurance.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_license.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_medical.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_medical_condition.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.family_medical_condition.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // user_mood.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_practice.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_profile_reviewer.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        // user_questionary.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_role.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_service.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_skill.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });
        await db.user_speciality.destroy({ where: { user_id: { [Op.notIn]: userIDList } } });

    } catch (e) {
        console.log(e)
    }
};
main();