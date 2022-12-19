/* eslint-disable no-unused-vars */
const config = require('../config/config.json');
const url = "https://hipaa-api.jotform.com";
var jotform = require("jotform");
jotform.options({
  debug: false,
  apiKey: config.jotform.apiKey,
  url: url
});
const formId = config.jotform.formId;
const webHook = config.jotform.webHook;

async function addFormProperty(form_id, name) {
  return jotform.addFormProperty(form_id, {
    properties: {
      title: name + ' Consultation form'
    }
  }).then(e => console.log(e)).fail(e => console.log(e));
}
async function cloneForm() {
  return jotform.cloneForm(formId).then(async resp => {
    await createFormWebhook(resp.id);
    return resp;
  });
}

async function createFormWebhook(form_id) {
  return jotform.createFormWebhook(form_id, webHook).then(res => {
    // console.log(res);
  }).catch(e => { });
}

async function getForm(form_id) {
  return jotform.getForm(form_id)
    .catch(e => { });
}

async function checkFormStatus(form_id) {
  return Promise.all([
    verifyProperty(form_id),
    verifyFormQuestion(formId)
  ]).then(async (resp) => {
    let props = resp[0];
    let quest = resp[1];
    let status = false;
    console.log(props.dropbox);
    if (props.dropbox.status && quest) {
      status = true;
    }
    // await db.clinic_jotform.update({ isActive: true }, { where: { clinic_id: cfi } });
    return { status, data: { ...props, consultationId: { status: !!quest } } };
  }).catch(e => {
    // console.log(e)
    return { status: false };
  });
}

var verifyProperty = async (form_id) => {
  let props = {
    // webhook: { status: false, error: 'NO Integration' },
    dropbox: { status: false, error: "Integration" }
  };
  return jotform.getFormProperties(form_id)
    .then((r) => {
      if (r && r.integrations) {
        let integrations = r.integrations;
        // console.log(integrations);
        if (!!integrations.dropbox && !!integrations.dropbox.sendPHI && integrations.dropbox.sendPHI.toLowerCase() == 'no') {
          props.dropbox.error = "PHI Status";
        } else {
          props.dropbox = { status: true, error: null };
        }
        // if (!!integrations.webhooks && !!integrations.webhooks.sendPHI && integrations.webhooks.sendPHI.toLowerCase() == 'no') {
        //   props.webhook.error = "PHI Status";
        // } else {
        //   let wbe = integrations.webhooks.endpoints;
        //   if (typeof wbe == 'string') wbe = JSON.parse(wbe);
        //   let status = wbe.includes(webHook);
        //   let error = status ? null : "Webhook URL";
        //   props.webhook = { status, error };
        // }
      }
      return props;
    })
    .fail(function (e) {
      return props;
    });
  //.finally(() => process.exit());
};

var verifyFormQuestion = async (form_id) => {
  return jotform.getFormQuestions(form_id)
    .then(e => {
      let fields = Object.values(e) || [];
      return fields.find(e => e.name.includes('consultationId')) || null;
    })
    .catch(e => null);
};

var getSubmissionData = async (sid) => {
  return jotform.getSubmission(sid).then(re => {
    if (!!re && !!re.answers) {
      let obj = {
        formID: re.form_id,
        consultationId: null,
        submissionID: re.id,
        pdfPath: '',
        data: {},
      };
      let answers = re.answers || [];
      for (let key in answers) {
        let element = answers[key];
        obj.data[element.name] = {
          text: element.text,
          answer: element.answer || null
        };
        if (!!!obj.consultationId && !!element.name.includes('consultationId')) {
          obj.consultationId = element.answer;
        }
        if (!!!obj.patient_id && !!element.name.includes('patient_id')) {
          obj.patient_id = element.answer;
        }
        if (!!!obj.provider_id && !!element.name.includes('provider_id')) {
          obj.provider_id = element.answer;
        }
        if (!!!obj.title && !!(element.name || '').toLowerCase().includes('certificate_type')) {
          obj.title = element.answer;
        }
      }
      return obj;
    } else {
      return null;
    }
  }).catch(r => null);
};

module.exports = {
  cloneForm, addFormProperty, createFormWebhook, getForm, checkFormStatus, verifyFormQuestion, verifyProperty, getSubmissionData
};