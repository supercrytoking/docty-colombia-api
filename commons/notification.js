const { sendEmail } = require('./helper');

function Notification(title = process.env.title) {
    this.title = `
    <thead>
    <tr>
        <td  align="center" bgcolor="gray"><a style="font-size:30px;color:white;line-height:50px;">${title}</a></td>
    </tr>
    </thead>
    <tbody>
    <tr>
        <td>
        <table width="700px" style="padding:20px;">
    
    <tr>
        <td>{{greeting}}</td>
    </tr>`;

    this.footer = `</table>
                        </td>
                    <tr>
                    </tbody>
                        <tfoot>
                    <tr>
                    <td  align="center" bgcolor="gray"><a href="https://bizlence.com" style="font-size:25px;color:white;line-height:40px;">https://bizlence.com</a></td>
                    </tr>
                </tfoot>`
    this.topic = title + ' Notification';
    this.greetingText = 'Hello';
    this.mail = ``;
}

Notification.prototype.greeting = function (value) {
    this.greetingText = value;
    return this;
};

Notification.prototype.subject = function (value) {
    this.topic = value;
    return this;
};

Notification.prototype.line = function (value) {
    this.mail += ` <tr>
                            <td>${value}</td>
                        </tr>`;
    return this;
};

Notification.prototype.link = function (label, link) {
    this.mail += `<tr>
    <td><a href="${link}">${label}</a></td>
  </tr>`;
    return this;
};
Notification.prototype.action = function (label, link = null) {
    this.mail += `<tr>
    <td align="center">
      <table>
        <tr>
          <td>`+
        (link ? `<a href="${link}">` : '') +
        `   <button style="font-size:20px;">
              ${label}
              </button>`
        + (link ? `</a>` : '') +
        `
          </td>
        </tr> 
       </table>
    </td>
  </tr>`;
    return this
};

Notification.prototype.notify = function (email) {
    this.mail = `<table width="700px">
                ${this.title}
                ${this.mail}
                ${this.footer}
                <table>`;
    this.mail = this.mail.replace('{{greeting}}', this.greetingText)

    return sendEmail(email, this.topic, { html: this.mail });
}

module.exports = Notification;