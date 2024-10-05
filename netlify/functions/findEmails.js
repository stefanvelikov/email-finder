const { crawlDomain } = require('../../scraper');

exports.handler = async (event) => {
    const domain = event.queryStringParameters.domain;

    if (!domain) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Domain parameter is required' })
        };
    }

    try {
        const emails = await crawlDomain(domain);
        return {
            statusCode: 200,
            body: JSON.stringify({ domain, emails: [...new Set(emails)] })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
