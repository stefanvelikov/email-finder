const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');

// Cloudflare email decoder
const decodeEmail = (encodedString) => {
    const email = [];
    const key = parseInt(encodedString.substr(0, 2), 16);
    
    for (let n = 2; n < encodedString.length; n += 2) {
        const charCode = parseInt(encodedString.substr(n, 2), 16) ^ key;
        email.push(String.fromCharCode(charCode));
    }
    
    return email.join('');
};

// Extract visible and obfuscated emails from HTML
const extractEmails = (html) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = html.match(emailRegex) || [];

    // Look for obfuscated emails
    const cfEmailRegex = /data-cfemail="([a-f0-9]+)"/g;
    let match;
    while ((match = cfEmailRegex.exec(html)) !== null) {
        emails.push(decodeEmail(match[1]));
    }
    
    console.log('Extracted emails:', emails); // Log extracted emails for debugging
    return [...new Set(emails)];
};

// Extract all links from a page
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

// Crawl the domain and find all emails
const crawlDomain = async (startUrl, visited = new Set()) => {
    if (visited.has(startUrl)) return [];
    visited.add(startUrl);

    try {
        const response = await axios.get(startUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36'
            }
        });
        const html = response.data;

        // Log the HTML for debugging
        console.log(`Fetched HTML from ${startUrl}:`, html.substring(0, 200)); // Logs the first 200 characters for quick preview

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

module.exports = { crawlDomain };
