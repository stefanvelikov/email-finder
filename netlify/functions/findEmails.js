const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');

const extractEmails = (html) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return [...new Set(html.match(emailRegex) || [])];
};

const extractLinks = (html, baseUrl) => {
    const $ = cheerio.load(html);
    const links = [];
    
    $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
            const absoluteUrl = url.resolve(baseUrl, href);
            links.push(absoluteUrl);
        }
    });
    
    return links;
};

const crawlDomain = async (startUrl, visited = new Set()) => {
    if (visited.has(startUrl)) return [];
    visited.add(startUrl);

    try {
        const response = await axios.get(startUrl);
        const html = response.data;

        const emails = extractEmails(html);
        const links = extractLinks(html, startUrl);
        const internalLinks = links.filter(link => link.startsWith(new URL(startUrl).origin));

        for (const link of internalLinks) {
            emails.push(...await crawlDomain(link, visited));
        }
        
        return emails;
    } catch (error) {
        console.error(`Error fetching ${startUrl}: ${error.message}`);
        return [];
    }
};

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
