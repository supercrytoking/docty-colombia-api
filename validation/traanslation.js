const Validator = require("validator");
const isEmpty = require("is-empty");
var slugify = require('slugify')

function validateAddressInput(data,update_data) {
  let errors = {};
  data.keyword = !isEmpty(data.keyword) ? data.keyword : "";
  data.section = !isEmpty(data.section) ? data.section : "";
  
  if (Validator.isEmpty(data.keyword)) { 
    errors.keyword = "SERVER_MESSAGE.KEYWORD_REQUIRED";
  } 
  
  if (Validator.isEmpty(data.section)) {
    errors.section = "SERVER_MESSAGE.SECTION_REQUIRED";
  }

return {
    errors,
    isValid: isEmpty(errors)
  };
}

module.exports ={validateAddressInput}