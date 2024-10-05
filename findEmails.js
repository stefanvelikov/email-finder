const { htmlToText } = require('html-to-text');
const Crawler = require('simplecrawler');

exports.handler = async (event) => {
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
        crawler.maxDepth = 5;

        // Function to extract emails using a regex pattern
        function extractEmails(text) {
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            return text.match(emailRegex) || [];
        }

        crawler.on('fetchcomplete', (queueItem, responseBuffer) => {
            const pageContent = responseBuffer.toString('utf8');
            const visibleText = htmlToText(pageContent, { wordwrap: 130 });
            const emails = extractEmails(visibleText);
            emails.forEach(email => allEmails.add(email));
        });

        crawler.on('complete', () => {
            resolve({
                statusCode: 200,
                body: JSON.stringify(Array.from(allEmails)),
            });
        });

        crawler.start();
    });
};
