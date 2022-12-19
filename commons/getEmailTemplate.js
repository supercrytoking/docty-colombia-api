const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {

    /**
     * @author Yorin
     * @param {*} trigger_name 
     * @param {*} data 
     * @param {*} lang 
     */

    // async getEmailTemplate(trigger_name, data, lang = 'en') {
    //     try {

    //         var email_automation = await db.email_automation.findOne({
    //             include: [
    //                 {
    //                     model: db.email_trigger,
    //                     as: 'trigger',
    //                     where: { name: trigger_name },
    //                     required: true
    //                 },
    //                 'template'
    //             ]
    //         });

    //         if (email_automation == null) return JSON.stringify(data);

    //         if (email_automation.trigger == null) return JSON.stringify(data);

    //         // in the feature, trigger process will be here
    //         // let trigger_type = email_automation.trigger.type;
    //         // switch(trigger_type){
    //         //     case 'email':
    //         //         queueEmail( ... )
    //         //         break;
    //         //     case 'sms':
    //         //         queueSMS( ... )
    //         //         break;
    //         //
    //         // }

    //         let email_template = email_automation.template;

    //         if (email_template == null) return JSON.stringify(data);

    //         let template = email_template.html;
    //         // replace shortcode with data.
    //         for (let key in data) {
    //             let str = "${" + key + "}"
    //             template = template.split(str).join(data[key]) //replace All
    //         }

    //         return template;
    //     } catch (err) {
    //         console.log(err)
    //         return JSON.stringify(data);
    //     }
    // },

    /**
     * @author Anurag Mishra
     * @param {*} trigger_name 
     * @param {*} data 
     * @param {*} lang 
     */

    getEmailTemplate: async (trigger_name, data, lang = 'en') => {
        return db.email_template.findOne({
            where: {
                language: lang
            },
            attributes: ['id', 'title', 'html'],
            include: [
                {
                    model: db.email_trigger,
                    as: 'trigger',
                    where: {
                        name: trigger_name
                    }
                }
            ]
        }).then(resp => {
            if (resp && resp.html) {
                let template = resp.html;
                // replace shortcode with data.
                for (let key in data) {
                    let str = "${" + key + "}"
                    template = template.split(str).join(data[key]) //replace All
                }
                return template;
            }else{
                return JSON.stringify(data);
            }
        }).catch(err=>{
            return JSON.stringify(data);
        })
    }

}