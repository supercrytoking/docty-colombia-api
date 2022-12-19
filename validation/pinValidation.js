const Validator = require("validator");
const isEmpty = require("is-empty");
module.exports = function pinValidation(data) {
  let errors = {};
// Convert empty fields to an empty string so we can use validator functions
  data.user_id = !isEmpty(data.user_id) ? data.user_id : "";
  data.pin = !isEmpty(data.pin) ? data.pin : "";
// Email checks
  if (Validator.isEmpty(data.user_id)) {
    errors.user_id = "User_id is required";
  } 
  // else if (!Validator.isEmail(data.email)) {
  //   errors.email = "Email is invalid";
  // }
// Password checks
  if (Validator.isEmpty(data.pin)) {
    errors.pin = "Pin is required";
  }
return {
    errors,
    isValid: isEmpty(errors)
  };
};