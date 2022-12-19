const Validator = require("validator");
const isEmpty = require("is-empty");
 

function validateAddressInput(data,update_data) {
  let errors = {};
  data.code = !isEmpty(data.code) ? data.code : "";
  data.name = !isEmpty(data.name) ? data.name : "";
  
  if (Validator.isEmpty(data.code)) { 
    errors.code = "SERVER_MESSAGE.CODE_REQUIRED";
  } 
  
  if (Validator.isEmpty(data.name)) {
    errors.name = "SERVER_MESSAGE.  ";
  }

return {
    errors,
    isValid: isEmpty(errors)
  };
}

module.exports ={validateAddressInput}