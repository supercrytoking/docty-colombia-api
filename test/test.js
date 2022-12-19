const Sequelize = require('sequelize');
const symptom = require('../clinic/controllers/symptom');
const Op = Sequelize.Op;
const db = require("../models");

var main = async () => {
    var clinic_id = 196
    var sql = `SELECT symptom_analysis.*, bookings.id as booking_id from symptom_analysis JOIN health_advisors ON health_advisors.patient_id = symptom_analysis.user_id AND health_advisors.clinic_id = ${clinic_id} AND health_advisors.approved = 1
    LEFT OUTER JOIN bookings ON bookings.dignosis_id = symptom_analysis.id
    where (health_advisors.family_access = 0 AND symptom_analysis.family_id = 0) OR (health_advisors.family_access = 1)`;
    // console.log
    var queryResult = await db.queryRun(sql);

    var list = queryResult || [];
    list.forEach(symptom => {
        if (typeof symptom.tirage == 'string') symptom.tirage = JSON.parse(symptom.tirage)
        if (typeof symptom.symptom_status == 'string') symptom.symptom_status = JSON.parse(symptom.symptom_status)
        if (symptom.tirage) {
            symptom.triage_level = symptom.tirage.triage_level
        }
    })

    var active_symptoms = list.filter(symptom => symptom.booking_id == null && symptom.changed_admin_id == null && symptom.changed_user_id == null);
    var status_changed = list.filter(symptom => symptom.booking_id != null || symptom.changed_admin_id != null || symptom.changed_user_id != null);
    var emergency = list.filter(symptom => symptom.triage_level != null || symptom.triage_level + ''.includes('emergency'))

    var male_symptoms = list.filter(symptom => symptom.sex == 'male').length
    var male_symptoms = list.filter(symptom => symptom.sex == 'female').length

    var symptom_12_22 = 0;
    var symptom_22_32 = 0;
    var symptom_33_50 = 0;
    var symptom_50 = 0;

    // 12~22
    // 22~32
    // 33~50
    // >50
    list.forEach(symptom => {
        if (symptom.age < 22) symptom_12_22++;
        else if (symptom.age < 32) symptom_22_32++;
        else if (symptom.age < 50) symptom_33_50++;
        else symptom_50++;
    });
    var is_normal = 0;
    var is_required_immediate_care = 0
    var is_will_self_care = 0
    var is_taking_counselling_by_a_provider = 0;

    status_changed.forEach(symptom => {
        if (symptom.symptom_status == null) return
        if (symptom.symptom_status.is_normal) is_normal++;
        if (symptom.symptom_status.is_required_immediate_care) is_required_immediate_care++;
        if (symptom.symptom_status.is_will_self_care) is_will_self_care++;
        if (symptom.symptom_status.is_taking_counselling_by_a_provider) is_taking_counselling_by_a_provider++;
    });


}
main();