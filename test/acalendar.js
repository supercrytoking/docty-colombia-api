const { google } = require('googleapis');
const calendar = google.calendar('v3');


const oauth2Client = new google.auth.OAuth2(
    '1013734515262-csgcm2o0euikla7jera9a2va7h6077cp.apps.googleusercontent.com',
    'CiA5shVMZ2-eoAKEKqaYCYMB',
    'http://localhost:3004/api/google_calendar/refresh_token'
);

// generate a url that asks permissions for Blogger and Google Calendar scopes
const scopes = [
    'https://www.googleapis.com/auth/calendar'
];

const url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',

    // If you only need one scope you can pass it as a string
    scope: scopes
});

console.log(url)

async function createEvent(event) {
    try {
        // var { tokens } = await oauth2Client.getToken('4/0AY0e-g44FtnOW2eoH3kKNLFjjjhSUenS-fcxPl5lDzGi5pFcIbrTWtSTazGzXWRv71tZuQ')
        // console.log(tokens)

        oauth2Client.setCredentials({
            'refresh_token': '1//06ZidSm-0Gw1RCgYIARAAGAYSNwF-L9IrY2VSHg3mdKG7BoN1Hb85pKBX2Zk4ek5B4ybFAkjWhBYm0p-z9g4GTLhDMbHrN2Ahbcg',
        });

        // var date = new Date();
        // date.setFullYear(date.getFullYear() - 30)
        // calendar.events.list({
        //     auth: oauth2Client,
        //     calendarId: 'primary',
        //     timeMin: (date).toISOString(),
        //     maxResults: 10,
        //     singleEvents: true,
        //     orderBy: 'startTime',
        // }, (err, res) => {
        //     if (err) return console.log('The API returned an error: ' + err);
        //     const events = res.data.items;
        //     if (events.length) {
        //         console.log('Upcoming 10 events:');
        //         events.map((event, i) => {
        //             const start = event.start.dateTime || event.start.date;
        //             console.log(`${start} - ${event.summary}`);
        //         });
        //     } else {
        //         console.log('No upcoming events found.');
        //     }
        // });
        var today = new Date();
        today.setHours(today.getHours() + 1);
        var end = new Date(today)
        end.setHours(end.getHours() + 1)
        const response = await calendar.events.insert({
            auth: oauth2Client,
            calendarId: 'primary',
            resource: {
                calendarId: 'primary',
                'start': {
                    'dateTime': today.toISOString(),//end,
                    // 'timeZone': timeZone
                },
                'end': {
                    'dateTime': end.toISOString(),//end,
                    // 'timeZone': timeZone
                },
                'summary': 'test',
                'yorin': 'yang descrip',
                singleEvents: true,
            },
        });
        console.log(response)
    } catch (e) {
        console.log('error', e)
    }
    // return response.data;
}
// createEvent({});