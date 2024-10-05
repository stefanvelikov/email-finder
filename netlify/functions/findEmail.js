const Crawler = require('simplecrawler');
const { htmlToText } = require('html-to-text');

exports.handler = async (event, context) => {
  const domain = event.queryStringParameters.domain;

  if (!domain) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Domain parameter is required' }),
    };
  }

  return new Promise((resolve) => {
    const allEmails = new Set();
    const crawler = new Crawler(domain);

    crawler.maxDepth = 5; // Set the depth limit
    crawler.respectRobotsTxt = false; // Ignore robots.txt (optional)

    // Function to extract emails using a regex pattern
    function extractEmails(text) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      return text.match(emailRegex) || [];
    }

    // Triggered when a page is discovered and fetched
    crawler.on('fetchcomplete', (queueItem, responseBuffer) => {
      const pageContent = responseBuffer.toString('utf8');
      const visibleText = htmlToText(pageContent, { wordwrap: 130 });

      const emails = extractEmails(visibleText);
      emails.forEach(email => allEmails.add(email)); // Add found emails to the Set
    });

    // Triggered when all pages have been crawled
    crawler.on('complete', () => {
      // Convert the Set to an array and resolve the response
      resolve({
        statusCode: 200,
        body: JSON.stringify(Array.from(allEmails)),
      });
    });

    // Start crawling
    crawler.start();
  });
};
