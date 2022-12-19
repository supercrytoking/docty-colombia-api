module.exports = {
  messageTemplate(userName, subject, message = null) {

    if (message == null) message = '';
    return `
        <div style="
        background: -moz-linear-gradient(top,  #94f7e8 0%, #94f7e8 30%, #e1e1e1 32%, #e1e1e1 100%); /* FF3.6-15 */
        background: -webkit-linear-gradient(top,  #94f7e8 0%,#94f7e8 30%,#e1e1e1 32%,#e1e1e1 100%); /* Chrome10-25,Safari5.1-6 */
        background: linear-gradient(to bottom,  #94f7e8 0%,#94f7e8 30%,#e1e1e1 32%,#e1e1e1 100%); /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */
        filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#94f7e8', endColorstr='#e1e1e1',GradientType=0 ); /* IE6-9 */ padding:30px 0px;
        ">

  <table style="max-width: 600px; margin: 15px auto; background:#fff; padding:30px">
    <tr>
      <td align="center" style="padding: 25px 0;"><img
          src="https://todonetworks.com:3002/icons/logo.png" alt="" />
      </td>
    </tr>
    <tr>
      <td style="background: #fff; padding: 70px; 50px;">
        <p>
          <b>Hi ${userName},</b>
          <div style="text-decoration: underline;">${subject}</div>
        </p>

        <p>
          ${message}
        </p>
      </td>

    </tr>

  </table>
  <br clear="both" />

  <table align="center">

    <tr>
      <td>

        <a href="#" style="font-size: 11px; color:#515151; text-decoration: none;">Docty.ai</a> |
        <a href="#" style="font-size: 11px; color:#515151; text-decoration: none;">Check Sysmptom</a> |
        <a href="#" style="font-size: 11px; color:#515151; text-decoration: none;">Help?</a>
      </td>
    </tr>
  </table>

  <p style="text-align:center; font-size: 12px;"> You are receiving this email because <br>user registration form was
    submitted on our website </p>

  <br> <br>
</div>
    `
  }
}