module.exports = {
  Slots: (start, end, duration) => {
    let s = new Date(start).getTime();
    let e = new Date(end).getTime();
    let c = new Date(start).getTime();
    duration = +duration;
    var result = [];

    while (c < e) {
      let se = c + (duration * 60 * 1000);
      let obj = {
        title: 'Available on Docty',
        calendarId: 4,
        start: new Date(c),
        end: new Date(se),
        category: "time",
        isAllDay: false,
        isReadOnly: false,
        state: 'Free'
      };
      if (se <= e) {
        result.push(obj);
      }
      end = new Date(se);
      c = se;
    }
    if (s < c && !!result.length)
      result.unshift({
        title: 'Available',
        calendarId: 2,
        start: new Date(s),
        end: new Date(end),
        category: "time",
        isAllDay: false,
        isReadOnly: false,
        state: 'Free'
      });
    return result;
  },
  resolveConflict: (newSlots, existingSlots) => {
    let existing = existingSlots.map(e => {
      return {
        start: new Date(e.start).getTime(),
        end: new Date(e.end).getTime(),
        calendarId: e.calendarId
      };
    });
    return newSlots.filter(e => {
      return e.calendarId === 2 || !!!existing.find(r => {
        let x = r.calendarId === 3 && (
          (r.start < new Date(e.end).getTime() && r.end > new Date(e.start).getTime())
          || (r.start >= new Date(e.end).getTime() && r.start <= new Date(e.start).getTime() && r.end <= new Date(e.start).getTime())
          || (r.end <= new Date(e.start).getTime() && r.end >= new Date(e.end).getTime() && r.start <= new Date(e.end).getTime())
          || (r.start > new Date(e.end).getTime() && r.start < new Date(e.start).getTime())
        );
        return x;
      });
    });
  }
};