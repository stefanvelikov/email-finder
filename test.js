const { crawlDomain } = require('./scraper');

const domain = process.argv[2]; // Get the domain from the command line argument

if (!domain) {
    console.error('Please provide a domain to scrape.');
    process.exit(1);
}

crawlDomain(domain).then(emails => {
    console.log(`Emails found on ${domain}:`);
    console.log(emails);
}).catch(error => {
    console.error('Error during scraping:', error.message);
});
