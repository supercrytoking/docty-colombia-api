var t = 'cZWs2ffWqk2UlJz3OdEB_F:APA91bG4LeP7tBw5694p73SV4x9GCFbYFH1D0p4IpbKt59ct91CN9D189tgVVUiwK_mqSho0cbp5jZXy7h4IXit5vW5x_9QSMg1Dm4WdMRlUXHVGZWPJS5c1MEx13gJ9lmh-L6WNhaIO'
const staticConfig = require(__dirname + '/../config/static.json');
var FCM = require('fcm-node');
var fcm = new FCM(staticConfig.fcmServerKey);

var title = '--title 9--';
var body = '______________body with removed payload___________';
var fcmData = {
    to: t,
    data: {
        collapsekey: 'New_Prescription',
        android_channel_id: "Message Notification",
        title: title,
        body: body,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        // token: token
    },
    "notification": {
        "title": title,
        "body": body,
        // "content_available": true,
        sound: "message.mp3",
    },
};
fcm.send(fcmData, function (err, response) {
    if (err) {
        console.log("Something has gone wrong!", err);
    } else {
        console.log("Successfully sent with response: ", response, fcmData);
    }
});