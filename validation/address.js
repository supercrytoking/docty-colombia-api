const Validator = require("validator");
const isEmpty = require("is-empty");
 

function validateAddressInput(data,update_data) {
  let errors = {};
// Convert empty fields to an empty string so we can use validator functions
  data.user_id = !isEmpty(data.user_id) ? data.user_id : "";
  data.appartment_no = !isEmpty(data.appartment_no) ? data.appartment_no : "";
  data.house_no = !isEmpty(data.house_no) ? data.house_no : "";
  data.city = !isEmpty(data.city) ? data.city : "";
  data.state = !isEmpty(data.state) ? data.state : "";
  data.country = !isEmpty(data.country) ? data.country : "";
  data.zip = !isEmpty(data.zip) ? data.zip : "";
  //data.id = !isEmpty(data.id) ? data.id : "";
// User id checks
  if (Validator.isEmpty(data.user_id)) { 
    errors.user_id = "User id field is required!";
  } 
  
// Appartment checks
  if (Validator.isEmpty(data.appartment_no)) {
    errors.appartment_no = "Appartment number  is required";
  }

  // Appartment checks
  if (Validator.isEmpty(data.house_no)) {
    errors.house_no = "House number  is required";
  }
  // Appartment checks
  if (Validator.isEmpty(data.city)) {
    errors.city = "City is required";
  }

  if(update_data=='update'){
    if (Validator.isEmpty(data.id)) {
        errors.id = "address  is required";
      }
  }
//   if (Validator.isEmpty(data.state_id)) {
//     errors.state_id = "State id is required";
//   }
//   if (Validator.isEmpty(data.country_id)) {
//     errors.country_id = "Country id is required";
//   }
  if (Validator.isEmpty(data.zip)) {
    errors.zip = "Zip code  is required";
  }
return {
    errors,
    isValid: isEmpty(errors)
  };
}

module.exports ={validateAddressInput}