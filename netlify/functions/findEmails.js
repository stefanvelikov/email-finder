const crawlDomain = async (startUrl, visited = new Set()) => {
    if (visited.has(startUrl)) return [];
    visited.add(startUrl);

    try {
        const response = await axios.get(startUrl);
        const html = response.data;

        // Log the HTML for debugging
        console.log(`Fetched HTML from ${startUrl}:`, html);

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
