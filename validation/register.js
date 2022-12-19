const Validator = require('validator');
const isEmpty = require('is-empty');
module.exports = { validateRegisterInput };
function validateRegisterInput(data) {
    let errors = {};

    data.name = !isEmpty(data.name) ? data.name : '';
    data.email = !isEmpty(data.email) ? data.email : '';
    data.first_name = !isEmpty(data.first_name) ? data.first_name : '';
    data.last_name = !isEmpty(data.last_name) ? data.last_name : '';

    data.company_name = !isEmpty(data.company_name) ? data.company_name : '';

    data.password = !isEmpty(data.password) ? data.password : '';
    data.password2 = !isEmpty(data.password2) ? data.password2 : '';
    data.phone_number = !isEmpty(data.phone_number) ? data.phone_number : '';
    data.phone_number = !isEmpty(data.phone_number) ? data.phone_number : '';
    data.national_id = !isEmpty(data.national_id) ? data.national_id : '';

    if (data.role == 1 || data.role == 2 || data.role == 3) {
        if (Validator.isEmpty(data.first_name)) {
            errors.first_name = "SERVER_MESSAGE.FIELD_REQUIRED";
        }

        if (Validator.isEmpty(data.last_name)) {
            errors.last_name = "SERVER_MESSAGE.FIELD_REQUIRED";
        }
    }
    if (data.role == 4 || data.role == 5 || data.role == 6) {
        if (Validator.isEmpty(data.company_name)) {
            errors.company_name = "SERVER_MESSAGE.FIELD_REQUIRED";
        }
    }
    if (Validator.isEmpty(data.phone_number)) {
        errors.phone_number = "SERVER_MESSAGE.PHONE_NUMBER_REQUIERD";
    }

    // if(Validator.isEmpty(data.national_id)){
    //     errors.national_id="National id field is required";
    // } 

    if (Validator.isEmpty(data.email)) {
        errors.email = "SERVER_MESSAGE.EMAIL_FIELD_REQUIRED";
    } else if (!Validator.isEmail(data.email)) {
        errors.email = "SERVER_MESSAGE.INVALID_EMAIL";
    }

    if (Validator.isEmpty(data.password)) {
        errors.password = "SERVER_MESSAGE.PASWORD_REQUIRED";
    } else if (!Validator.isLength(data.password, { min: 6, max: 30 })) {
        errors.password = "SERVER_MESSAGE.INVALID_LENGTH";
    }
    if (Validator.isEmpty(data.password2)) {
        errors.password2 = "SERVER_MESSAGE.FIELD_REQUIRED";
    }
    if (!Validator.isEmpty(data.password2) && !Validator.equals(data.password, data.password2)) {
        errors.password2 = "SERVER_MESSAGE.UNMATCHED_PASSWORD";
    }
    return {
        errors,
        isValid: isEmpty(errors)
    }
}