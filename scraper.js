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

// Improved email extraction function
const extractEmails = (html, targetDomain) => {
    // Improved regex: Exclude common placeholders and non-email patterns
    const emailRegex = /(?<!\b(?:example|user|name|noreply|flags|[a-f0-9]{32})\b)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = html.match(emailRegex) || [];

    // List of domains to exclude
    const unwantedDomains = ['sentry-next.wixpress.com', 'spamesu.com', 'example.com', 'domain.com', '2x.png', 'jpg'];
    
    // Filter out unwanted domains
    const filteredEmails = emails.filter(email => {
        const domain = email.split('@')[1].toLowerCase();
        return !unwantedDomains.some(unwanted => domain.includes(unwanted));
    });

    // Look for obfuscated emails and decode
    const cfEmailRegex = /data-cfemail="([a-f0-9]+)"/g;
    let match;
    while ((match = cfEmailRegex.exec(html)) !== null) {
        const decodedEmail = decodeEmail(match[1]);
        const decodedDomain = decodedEmail.split('@')[1].toLowerCase();
        if (!unwantedDomains.some(unwanted => decodedDomain.includes(unwanted))) {
            filteredEmails.push(decodedEmail);
        }
    }

    // Check for relevance to the target domain
    return [...new Set(filteredEmails)].filter(email => isRelevantEmail(email, targetDomain));
};

// Function to check if an email is relevant to the target domain
const isRelevantEmail = (email, targetDomain) => {
    const emailDomain = email.split('@')[1].toLowerCase();
    return emailDomain.includes(targetDomain.replace(/^www\./, '').toLowerCase());
};

// Extract all internal links from a page
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

// Function to retry fetching HTML up to 3 times if it fails
const fetchHtml = async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36'
                }
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching ${url}: ${error.message}. Retry ${i + 1}/${retries}`);
            if (i === retries - 1) throw error; // Throw error after all retries
        }
    }
};

// Recursive function to crawl domain for emails
const MAX_DEPTH = 3;

const crawlDomain = async (startUrl, visited = new Set(), depth = 0) => {
    if (visited.has(startUrl) || depth > MAX_DEPTH) return [];
    visited.add(startUrl);

    try {
        const html = await fetchHtml(startUrl);
        const targetDomain = new URL(startUrl).hostname;

        // Extract emails from the page content
        const emails = extractEmails(html, targetDomain);

        // Extract internal links to crawl further
        const links = extractLinks(html, startUrl);
        const internalLinks = links.filter(link => link.startsWith(new URL(startUrl).origin));

        // Recursively visit each link
        for (const link of internalLinks) {
            emails.push(...await crawlDomain(link, visited, depth + 1));
        }
        
        return emails;
    } catch (error) {
        console.error(`Failed to fetch ${startUrl} after retries: ${error.message}`);
        return [];
    }
};

module.exports = { crawlDomain };
