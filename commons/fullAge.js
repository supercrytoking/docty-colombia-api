const { getTranslations, getTranslation } = require('./helper');

module.exports = {
  async getFullAge(dateString, lang = 'en') {
    let translation = await getTranslations(lang, ['PROFILE']);
    let now = new Date();

    let yearNow = now.getFullYear();
    let monthNow = now.getMonth();
    let dateNow = now.getDate();

    let dob = new Date(dateString);

    let yearDob = dob.getFullYear();
    let monthDob = dob.getMonth();
    let dateDob = dob.getDate();
    let monthAge = 0;
    let dateAge = 0;
    let age = [];
    let ageString = "";
    let yearString = "";
    let monthString = "";
    let dayString = "";

    let yearAge = yearNow - yearDob;

    if (monthNow >= monthDob)
      monthAge = monthNow - monthDob;
    else {
      yearAge--;
      monthAge = 12 + monthNow - monthDob;
    }

    if (dateNow >= dateDob)
      dateAge = dateNow - dateDob;
    else {
      monthAge--;
      dateAge = 31 + dateNow - dateDob;

      if (monthAge < 0) {
        monthAge = 11;
        yearAge--;
      }
    }

    if (yearAge < 2) {
      yearString = getTranslation(translation, 'PROFILE', 'YEAR');
    } else {
      yearString = getTranslation(translation, 'PROFILE', 'YEARS');
    }
    if (monthAge < 2) {
      monthString = getTranslation(translation, 'PROFILE', 'MONTH');
    } else {
      monthString = getTranslation(translation, 'PROFILE', 'MONTHS');
    }
    if (dateAge < 2) {
      dayString = getTranslation(translation, 'PROFILE', 'DAY');
    } else {
      dayString = getTranslation(translation, 'PROFILE', 'DAYS');
    }

    age = [
      yearAge, yearString,
      monthAge, monthString,
      dateAge, dayString
    ];
    ageString = age.join(' ');
    return ageString;
  }
};
