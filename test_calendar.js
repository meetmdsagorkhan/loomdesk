const https = require('https');

const year = new Date().getFullYear();
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY;

// we don't have the API key in our environment, let's just grep the .env file
