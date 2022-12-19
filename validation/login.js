const Validator = require("validator");
const isEmpty = require("is-empty");
module.exports = function validateLoginInput(data) {
  let errors = {};
// Convert empty fields to an empty string so we can use validator functions
  data.login_id = !isEmpty(data.login_id) ? data.login_id : "";
  data.password = !isEmpty(data.password) ? data.password : "";
// Email checks
  if (Validator.isEmpty(data.login_id)) {
    errors.login_id = "SERVER_MESSAGE.EMAIL_FIELD_REQUIRED";
  } 
  // else if (!Validator.isEmail(data.email)) {
  //   errors.email = "Email is invalid";
  // }
// Password checks
  if (Validator.isEmpty(data.password)) {
    errors.password = "SERVER_MESSAGE.PASWORD_REQUIRED";
  }
return {
    errors,
    isValid: isEmpty(errors)
  };
};