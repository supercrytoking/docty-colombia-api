const Validator = require("validator");
const isEmpty = require("is-empty");
 

function validateServicePricingInput(data,update_data) {
  let errors = {};
  // Convert empty fields to an empty string so we can use validator functions
  data.user_id = !isEmpty(data.user_id) ? data.user_id : "";
  data.service = !isEmpty(data.service) ? data.service : "";
  data.charge_type = !isEmpty(data.charge_type) ? data.charge_type : "";
  data.fees = !isEmpty(data.fees) ? data.fees : "";
  data.recurring_fee = !isEmpty(data.recurring_fee) ? data.recurring_fee : "";
  data.title = !isEmpty(data.title) ? data.title : "";
  data.valid_till = !isEmpty(data.valid_till) ? data.valid_till : "";
  data.id = !isEmpty(data.id) ? data.id : "";
// User id checks
  if (Validator.isEmpty(data.user_id)) { 
    errors.user_id = "User id field is required!";
  } 
  


  // Appartment checks
  if (Validator.isEmpty(data.service)) {
    errors.service = "Service  is required";
  }
  // Appartment checks
  if (Validator.isEmpty(data.charge_type)) {
    errors.charge_type = "Charge Type  is required";
  }
  //fees
  if (Validator.isEmpty(data.fees)) {
    errors.fees = "Fee field is required";
  }
//recurring_fee
if (Validator.isEmpty(data.recurring_fee)) {
  errors.recurring_fee = "recurring fee is required";
}

if (Validator.isEmpty(data.title)) {
  errors.title = "Title is required";
} 

  if(update_data=='update'){
    if (Validator.isEmpty(data.id)) {
        errors.id = "id  is required";
      }
  }
//   if (Validator.isEmpty(data.state_id)) {
//     errors.state_id = "State id is required";
//   }
//   if (Validator.isEmpty(data.country_id)) {
//     errors.country_id = "Country id is required";
//   }

return {
    errors,
    isValid: isEmpty(errors)
  };
}

module.exports ={validateServicePricingInput}