const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Utility function to extract all email addresses from HTML
const extractEmails = (html) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return [...new Set(html.match(emailRegex) || [])]; // Use Set to remove duplicates
};

// Utility function to find all anchor links from a page
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

// Function to crawl a domain and find all emails
const crawlDomain = async (startUrl, visited = new Set()) => {
    if (visited.has(startUrl)) return []; // Avoid revisiting pages
    visited.add(startUrl);

    try {
        const response = await axios.get(startUrl);
        const html = response.data;

        // Extract emails from the page
        const emails = extractEmails(html);
        
        // Find all internal links to crawl further
        const links = extractLinks(html, startUrl);
        
        // Filter internal links
        const internalLinks = links.filter(link => link.startsWith(new URL(startUrl).origin));

        // Recursively visit each link
        for (const link of internalLinks) {
            emails.push(...await crawlDomain(link, visited));
        }
        
        return emails;
    } catch (error) {
        console.error(`Error fetching ${startUrl}: ${error.message}`);
        return [];
    }
};

// Define API endpoint
app.get('/find-emails', async (req, res) => {
    const { domain } = req.query;
    
    if (!domain) {
        return res.status(400).json({ error: 'Domain parameter is required' });
    }
    
    try {
        const emails = await crawlDomain(domain);
        res.json({ domain, emails: [...new Set(emails)] }); // Remove duplicate emails
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
