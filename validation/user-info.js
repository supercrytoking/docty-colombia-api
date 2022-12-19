const Validator = require('validator');
const isEmpty = require('is-empty');
module.exports = { userInfoValidation };
function userInfoValidation(data) {
    let errors = {};

    data.name = !isEmpty(data.name) ? data.name : '';
    data.email = !isEmpty(data.email) ? data.email : '';
    data.first_name = !isEmpty(data.first_name) ? data.first_name : '';
    data.last_name = !isEmpty(data.last_name) ? data.last_name : '';

    data.phone_number = !isEmpty(data.phone_number) ? data.phone_number.toString() : '';
    // data.phone_number = !isEmpty(data.phone_number) ? data.phone_number : '';
    data.national_id = !isEmpty(data.national_id) ? data.national_id : '';

    data.national_id = !isEmpty(data.national_id) ? data.national_id : '';
    // data.country_id=!isEmpty(data.country_id)?data.country_id:'';
    data.dob = !isEmpty(data.dob) ? data.dob : '';

    // if(Validator.isEmpty(data.first_name)){
    //     errors.first_name="First name field is required";
    // }

    // if(Validator.isEmpty(data.last_name)){
    //     errors.last_name="Last name field is required";
    // }

    if (Validator.isEmpty(data.phone_number)) {
        errors.phone_number = "SERVER_MESSAGE.PHONE_NUMBER_REQUIERD";
    }

    // if(Validator.isEmpty(data.national_id)){
    //     errors.national_id="National id field is required";
    // } 
    // if(Validator.isEmpty(data.country_id)){
    //     errors.country_id="Country id field is required";
    // } 
    if (Validator.isEmpty(data.dob)) {
        errors.dob = "SERVER_MESSAGE.DOB_REQUIRED";
    }
    // if (Validator.isEmpty(data.email)) {
    //     errors.email = "SERVER_MESSAGE.EMAIL_FIELD_REQUIRED";
    // } else
    if (!!data.email && !Validator.isEmail(data.email)) {
        errors.email = "SERVER_MESSAGE.INVALID_EMAIL";
    }

    return {
        errors,
        isValid: isEmpty(errors)
    };
}