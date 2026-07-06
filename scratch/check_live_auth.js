const BTP_AUTH_URL = 'https://client-pme-5ad225cetrial.cfapps.us10-001.hana.ondemand.com/auth.html';

async function checkAuth() {
    console.log(`Fetching live auth.html from: ${BTP_AUTH_URL}`);
    try {
        const res = await fetch(BTP_AUTH_URL);
        console.log('HTTP Status:', res.status);
        if (res.ok) {
            const html = await res.text();
            console.log('HTML Length:', html.length);
            
            // Search for our added code
            const searchTerms = [
                'sessionStorage.setItem(\'bpType\', dbType);',
                'finalRole = \'client_b2c\';'
            ];
            
            searchTerms.forEach(term => {
                const index = html.indexOf(term);
                if (index !== -1) {
                    console.log(`Found "${term}" at index ${index}. Snippet:`);
                    console.log(html.substring(index - 100, index + 200));
                    console.log('--------------------------------------------------');
                } else {
                    console.log(`NOT found: "${term}"`);
                }
            });
        } else {
            console.error('Error response:', await res.text());
        }
    } catch (err) {
        console.error('Error fetching auth:', err.message);
    }
}

checkAuth();
