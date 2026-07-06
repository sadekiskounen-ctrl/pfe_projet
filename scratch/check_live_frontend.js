const BTP_FRONTEND_URL = 'https://client-pme-5ad225cetrial.cfapps.us10-001.hana.ondemand.com/crm/index.html';

async function checkFrontend() {
    console.log(`Fetching live crm/index.html from: ${BTP_FRONTEND_URL}`);
    try {
        const res = await fetch(BTP_FRONTEND_URL);
        console.log('HTTP Status:', res.status);
        if (res.ok) {
            const html = await res.text();
            console.log('HTML Length:', html.length);
            
            // Search for our added code
            const searchTerms = [
                'IS_B2B =',
                'clientBadge',
                'nav-factures',
                'kpiCardDevis'
            ];
            
            searchTerms.forEach(term => {
                const index = html.indexOf(term);
                if (index !== -1) {
                    console.log(`Found "${term}" at index ${index}. Snippet:`);
                    console.log(html.substring(index, index + 200));
                    console.log('--------------------------------------------------');
                } else {
                    console.log(`NOT found: "${term}"`);
                }
            });
        } else {
            console.error('Error response:', await res.text());
        }
    } catch (err) {
        console.error('Error fetching frontend:', err.message);
    }
}

checkFrontend();
