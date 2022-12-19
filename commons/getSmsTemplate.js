const rebrandly = require('../commons/rebrandly');


const getSms = async (trigger_name, template, data) => {
    if (!!data.link) {  /* if there is any link exist in sms data, it is shortened */
        let result = await rebrandly.linkGen(data.link).then((short) => {
            if (short) {
                data.link = short;
            }
        });
    }
    return new Promise((resolve, reject) => {
        console.log(trigger_name);
        let sms;
        switch (trigger_name) {
            case "New_Signup":
                sms = template.split("<OTP>").join(data.otp.toString()).split("{username}").join(data.name);
                break;
            case "New_Counselling_To_Doctor":
            case "Booking_Confirm_To_Patient":
            case "Booking_Accept_To_Patient":
                sms = template.split("{doctor_name}").join(data.doctor_name).split("{patient_name}").join(data.patient_name).split("{link}").join(data.link).split("{request_number}").join(data.request_number).split("{time}").join(data.time);
                break;
            // case "booking_request_details_family":
            //     sms = template.split("{doctor_name}").join(data.doctor_name).split("{patient_name}").join(data.patient_name).split("{family_member}").join(data.family_member).split("{date}").join(data.date).split("{time}").join(data.time);
            //     break;
            case "Reminder_To_Patient_10_Minute":
            case "Reminder_To_Patient_1_Minute":
            case "Reminder_To_Doctor_10_Minute":
            case "Reminder_To_Doctor_1_Minute":
                sms = template.split("{doctor_name}").join(data.doctor_name).split("{patient_name}").join(data.patient_name).split("{time}").join(data.time).split("{link}").join(data.link);
                break;
            case "Booking_Reject_To_Patient":
                sms = template.split("{doctor_name}").join(data.doctor_name).split("{patient_name}").join(data.patient_name).split("{rejected_remarks}").join(data.rejected_remarks).split("{request_number}").join(data.request_number);
                break;
            case "New_Prescription":
                sms = template.split("{doctor_name}").join(data.doctor_name).split("{link}").join(data.link);
                break;
        }

        return resolve(sms);
    });
};

module.exports = {
    getSms: getSms,
    getSmsTemplate: async (template, data) => {
        if (!!data.link) {  /* if there is any link exist in sms data, it is shortened */
            let result = await rebrandly.linkGen(data.link).then((short) => {
                if (short) {
                    data.link = short;
                }
            });
        }
        for (let key in data) {
            let l = '${' + key + '}';
            template = template.split(l).join(data[key]);
        }
        return Promise.resolve(template);
    }
};