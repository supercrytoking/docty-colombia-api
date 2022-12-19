const Validator = require("validator");
const isEmpty = require("is-empty");
module.exports = {verifyPassword}
function verifyPassword(data) {
  let errors = {};
// Convert empty fields to an empty string so we can use validator functions
  data.user_id = !isEmpty(data.user_id) ? data.user_id : "";
  data.password = !isEmpty(data.password) ? data.password : "";
  data.password2 = !isEmpty(data.password2) ? data.password2 : "";
  console.log(data);
// Email checks
  if (Validator.isEmpty(data.user_id)) { 
    errors.user_id = "Id is required";
  } 
  // else if (!Validator.isEmail(data.email)) {
  //   errors.email = "Email is invalid";
  // }
// Password checks
  if (Validator.isEmpty(data.password)) {
    errors.password = "password field is required";
  }
  if (Validator.isEmpty(data.password2)) {
    errors.password2="Confirm password field is required";
  }

  if(!Validator.isEmpty(data.password2) && !Validator.equals(data.password,data.password2)){
        errors.password2="Password and Confirm password should be equal";
    }

return {
    errors,
    isValid: isEmpty(errors)
  };
}