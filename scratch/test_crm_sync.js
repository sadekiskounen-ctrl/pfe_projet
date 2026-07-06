const BTP_BASE_URL = 'https://5ad225cetrial-dev-gestion-pme-srv.cfapps.us10-001.hana.ondemand.com';
const authHeader = 'Basic ' + Buffer.from('admin:admin').toString('base64');

async function testEndpoint(endpoint) {
    const url = `${BTP_BASE_URL}${endpoint}`;
    console.log(`\nFetching: ${url}`);
    try {
        const res = await fetch(url, {
            headers: { 'Authorization': authHeader }
        });
        console.log('HTTP Status:', res.status);
        if (res.ok) {
            const data = await res.json();
            console.log('Results Count:', data.value ? data.value.length : 'unknown');
            if (data.value && data.value.length > 0) {
                data.value.forEach(item => {
                    console.log(JSON.stringify(item, null, 2));
                });
            } else {
                console.log(' No items found.');
            }
        } else {
            const text = await res.text();
            console.error('Error response:', text);
        }
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

async function run() {
    console.log('=== CHECKING CRM ENDPOINTS ON BTP ===');
    await testEndpoint('/odata/v4/crm/ClientsB2B');
    await testEndpoint('/odata/v4/crm/ClientsB2C');
    await testEndpoint('/odata/v4/crm/BusinessPartners');
}

run();
