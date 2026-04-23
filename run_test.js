const { format } = require('date-fns');

const data = {
  items: [
    {
      start: { date: '2024-05-01' },
      end: { date: '2024-05-02' },
      summary: 'May Day',
      description: 'Test'
    }
  ]
};

const holidaysData = [];

data.items?.forEach((item) => {
  if (!item.start?.date) return;
  
  const startDateStr = item.start.date;
  const endDateStr = item.end?.date;
  const name = item.summary;
  const description = item.description;

  holidaysData.push({ date: startDateStr, name, description });

  if (endDateStr) {
    const [year, month, day] = startDateStr.split('-').map(Number);
    const startObj = new Date(year, month - 1, day);
    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
    const endObj = new Date(endYear, endMonth - 1, endDay);
    
    startObj.setDate(startObj.getDate() + 1);
    while (startObj < endObj) {
      const dateStr = format(startObj, 'yyyy-MM-dd');
      holidaysData.push({ date: dateStr, name, description });
      startObj.setDate(startObj.getDate() + 1);
    }
  }
});

console.log('holidaysData', holidaysData);

const modifiersHoliday = holidaysData.map((holiday) => {
  const [year, month, day] = holiday.date.split('-').map(Number);
  return new Date(year, month - 1, day);
});

console.log('modifiersHoliday', modifiersHoliday);
