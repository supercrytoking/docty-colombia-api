const { crmTrigger, getMobilePushNotificationTemplate, sendMobilePushNotification, sendWebPushNotification } = require('../commons/crmTrigger');
const db = require("../models");

const fs = require('fs');
const config = require(__dirname + '/../config/config.json');
const server = require('https').createServer({
    key: fs.readFileSync('./cert/docty.key'),
    cert: fs.readFileSync('./cert/STAR_docty_ai.crt'),
});
const btoa = require('btoa');

var io = require('socket.io')(server);
io.attach(server, {
    pingInterval: 10000,
    pingTimeout: 5000
});


io.use((socket, next) => {
    let token = socket.handshake.query.userid;
    onlineSocket[token] = socket;
    if (!!(token)) {
        return next();
    }
    return next();
    // return next(new Error('authentication error'));
});

var onlineSocket = {};
io.on('connection', async function (socket) {
    var _uid;
    // let userid = socket.handshake.query.userid;

    // socket.id = userid;
    socket.on('chat message', async function (data) {
        data.epoch = Date.now();
        if (data.receiver) io.emit(`userid${data.receiver}`, data);
        if (data.receiver_admin) io.emit(`adminid${data.receiver_admin}`, data);
        await db.message_log.create(data);
        try {
            let receiver_user;
            let sender_user;

            if (data.receiver) {
                receiver_user = await db.user.findOne({
                    where: { id: data.receiver }, include: [{
                        model: db.user_role,
                        as: 'user_role'
                    },
                    {
                        model: db.associate,
                        as: 'associatedTo'
                    },
                    ]
                });
                var titleBody = await getMobilePushNotificationTemplate('Message', { reveiver_name: receiver_user.fullName, message: data.message }, (receiver_user || {}).lang);
                if (titleBody) {
                    var title = titleBody.title;
                    var body = titleBody.body;
                    sendWebPushNotification(data.receiver, title, body, 'message');
                }

                if (receiver_user && receiver_user.associatedTo && receiver_user.associatedTo.user_id) {
                    io.emit(`companyid${receiver_user.associatedTo.user_id}`, data);
                }
            }
            if (data.receiver_admin) {
                receiver_user = await db.admin.findOne({ where: { id: data.receiver_admin } });
                var titleBody = await getMobilePushNotificationTemplate('Message', { reveiver_name: receiver_user.fullName, message: data.message }, (receiver_user || {}).lang);
                if (titleBody) {
                    var title = titleBody.title;
                    var body = titleBody.body;
                    sendWebPushNotification(data.receiver_admin, title, body, 'message', true);
                }
            }

            if (data.sender) {
                sender_user = await db.user.findOne({
                    where: { id: data.sender }, include: [{
                        model: db.associate,
                        as: 'associatedTo'
                    }]
                });
                if (sender_user && sender_user.associatedTo && sender_user.associatedTo.user_id) {
                    io.emit(`companyid${sender_user.associatedTo.user_id}`, data);
                }
            }
            if (data.sender_admin) {
                sender_user = await db.admin.findOne({ where: { id: data.sender_admin } });
            }

            if (receiver_user == null || sender_user == null) return;
            var consultation_link = '';
            var consultation_id = '';
            if (data.booking) {
                var booking = await db.booking.findByPk(data.booking);
                consultation_id = booking.reference_id;
                if (receiver_user.user_role) {
                    switch (receiver_user.user_role.role_id) {
                        case 2:
                            consultation_link = `${config.domains.patient} /my-consultation/${btoa(data.booking).replace(/=/g, '')} `;
                            break;
                        case 1:
                            consultation_link = `${config.domains.doctor} /my-consultation/${btoa(data.booking).replace(/=/g, '')} `;

                    }
                }
            }

            crmTrigger('Message', {
                email: receiver_user.email,
                subject: 'Docty Health Care: Message',
                receiver_name: `${receiver_user.first_name} ${receiver_user.last_name} `,
                sender_name: `${sender_user.first_name} ${sender_user.last_name} `,
                message: data.message,
                consultation_link: consultation_link,
                consultation_id: consultation_id
            }, receiver_user.lang || 'en');
            let fcmData = {
                // to: subscription.fcm_token,
                collapse_key: 'call',
                android: {
                    ttl: '40s',
                    priority: 'high',
                },
                data: {
                    title: 'New Message',
                    body: data.message,
                    collapsekey: 'Message',
                    callCount: "10",
                    android_channel_id: "Message",
                    collapsekey: 'Message',
                    callerName: sender_user.fullName || sender_user.company_name,
                    patientId: receiver_user.id,
                    providerId: sender_user.id,
                    sound: "ring.mp3",
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                }
            };
            sendMobilePushNotification(receiver_user.id, fcmData, sender_user.id, 'android', false)
        } catch (e) {
            console.log(e);
        }
    });

    socket.on('booking_updated', async function (data) {
        if (data.user_id) io.emit(`booking_updated_${data.user_id} `, data);
        io.emit(`booking_updated`, data);
    });

    socket.on('call_notification', async function (data) {
        io.emit(`call_notification_${data.receiver_id}`, data);
        console.log(data)
        var titleBody = await getMobilePushNotificationTemplate('Call_Notification', {});
        if (titleBody) {
            var title = titleBody.title;
            var body = titleBody.body;
            var fcmData = {
                // to: subscription.fcm_token,
                collapse_key: 'call',
                android: {
                    ttl: '40s',
                    priority: 'high',
                    // registration_ids: registration_ids
                },
                data: {
                    title: title,
                    body: body,
                    callCount: "10",
                    android_channel_id: "Call Notification",
                    callerName: data.name,
                    bookId: data.book_id,
                    referenceId: data.reference_id,
                    patientId: data.receiver_id,
                    providerId: data.sender_id,
                    sound: "ring.mp3",
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                    // token: token
                }
            };
            sendMobilePushNotification(data.receiver_id, fcmData, data.sender_id, 'android');
            let time = Date.now();
            var fcmData = {
                // to: subscription.fcm_token,
                collapse_key: 'call',
                android: {
                    ttl: '40s',
                    priority: 'high',
                    // registration_ids: registration_ids
                },
                data: {
                    title: title,
                    body: body,
                    callCount: "10",
                    android_channel_id: "Call Notification",
                    callerName: data.name,
                    bookId: data.book_id,
                    referenceId: data.reference_id,
                    patientId: data.receiver_id,
                    providerId: data.sender_id,
                    sound: "ring.mp3",
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                    // token: token
                },
                "notification": {
                    "title": title,
                    "body": body,
                    // "content_available": true,
                    sound: "ring.mp3",
                },
                apns: {
                    payload: {
                        aps: {
                            alert: {
                                title: title,
                                body: body
                            },
                            sound: 'ring.mp3'
                        }
                    },
                    headers: {
                        "apns-expiration": (time / 1000 + 40)
                    }
                }
            };
            sendMobilePushNotification(data.receiver_id, fcmData, data.sender_id, 'ios');
            var returnUrl = `/my-consultation/${btoa(data.book_id).replace(/=/g, '')}`;
            sendWebPushNotification(data.receiver_id, title, body, `${config.domains.patient}/${encodeURIComponent(returnUrl)}`);
        }
    });
    socket.on('call_notification_end', function (data) {
        io.emit(`call_notification_end_${data.receiver_id}`, data);
        // var fcmData = {
        //     collapse_key: 'terminate_call',
        //     android: {
        //         ttl: '40s',
        //         priority: 'high',
        //     },
        //     data: {
        //         android_channel_id: "Call Notification",
        //     }
        // };
        var fcmData = {
            collapse_key: 'call',
            android: {
                ttl: '40s',
                priority: 'high',
            },
            data: {
                collapsekey: "Terminate_Call",
                android_channel_id: "Call Notification",
            }
        };
        sendMobilePushNotification(data.receiver_id, fcmData, data.sender_id, 'android');
    });

    socket.on('login', async function (uid) {
        _uid = uid;
        onlineSocket[uid] = socket;
        try {
            if (uid && uid + ''.includes('userid')) {
                var user = await db.user.findOne({ where: { id: uid.replace('userid', '') }, attributes: ['isAvailableStatus'], include: [{ model: db.user_role, attributes: ['role_id'] }] });
                if (user && user.user_role && user.user_role.role_id == 2) {
                    return io.emit('online_user', { uid: uid, status: true });
                } else if (user && user.isAvailableStatus) {
                    io.emit('online_user', { uid: uid, status: true });
                } else {
                    io.emit('online_user', { uid: uid, status: false });
                }
            }
            if (uid && uid.includes('adminid')) {
                io.emit('online_user', { uid: uid, status: true });
            }
        } catch (e) { }
    });

    socket.on('logout', function (uid) {
        onlineSocket[uid] = null;
        io.emit('online_user', { uid: uid, status: false });
        try {
            console.log('uid', uid);
            if (uid && uid.includes('userid')) {
                let id = uid.replace('userid', '');
                if (!!id) db.user.update({ isAvailableStatus: false }, { where: { id: id } });
            }
        } catch (e) { console.log(e); }
    });

    socket.on('getOnlineStatus', async function (peerId) {
        try {
            if (peerId && peerId.includes('userid')) {
                var user = await db.user.findOne({ where: { id: peerId.replace('userid', '') }, attributes: ['isAvailableStatus'], include: [{ model: db.user_role, attributes: ['role_id'] }] });
                if (user == null) return;
                user = JSON.parse(JSON.stringify(user));
                var role = 0;
                if (user.user_role != null && user.user_role.role_id) role = user.user_role.role_id;

                if (role == 1) {//doctor
                    if (!!user.isAvailableStatus) {
                        io.emit('online_user', { uid: peerId, status: (!!onlineSocket[peerId]) });
                    }
                    else {
                        io.emit('online_user', { uid: peerId, status: false });
                    }
                } else {
                    io.emit('online_user', { uid: peerId, status: (!!onlineSocket[peerId]) });
                }
            }
            if (peerId && peerId.includes('adminid')) {
                io.emit('online_user', { uid: peerId, status: (!!onlineSocket[peerId]) });
            }
        } catch (e) { }
    });

    socket.on('isOnline', async function (peerId) {
        try {
            io.emit('isOnline', { [peerId]: (!!onlineSocket[peerId]) });
        } catch (e) { }
    });
    socket.on('reloadRequest', async function (data) {
        try {
            console.log(data)
            io.emit(`reloadRequest_${data.reference_id}`, data);
        } catch (e) { }
    });

    socket.on('istyping', async function (data) {
        try {
            if (!!data.receiver) {
                console.log(`istyping_${data.receiver}`, data)
                io.emit(`istyping_${data.receiver}`, data);
            }
            if (!!data.receiver_admin) {
                io.emit(`istyping_admin_${data.receiver_admin}`, data);
            }
        } catch (e) { }
    });

    socket.on('disconnect', function (socket) {
        onlineSocket[_uid] = null;
        delete onlineSocket[_uid];
        try {
            delete onlineSocket[socket.id];
        } catch (error) {
            //
        }
        io.emit('online_user', { uid: _uid, status: false });
        try {
            if (_uid && _uid.includes('userid')) {
                let id = _uid.replace('userid', '');
                if (!!id) db.user.update({ isAvailableStatus: false }, { where: { id: id } });
            }
        } catch (e) { console.log(e); }
    });
});

global.io = io;
global.onlineSocket = onlineSocket;
module.exports.io = io;