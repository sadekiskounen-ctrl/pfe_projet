const BTP_BASE_URL = 'https://5ad225cetrial-dev-gestion-pme-srv.cfapps.us10-001.hana.ondemand.com';

async function testLogin() {
    const url = `${BTP_BASE_URL}/odata/v4/registration/login`;
    console.log(`\nCalling login endpoint: ${url}`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'sadekiskounen@gmail.com',
                password: 'sadek100'
            })
        });
        console.log('HTTP Status:', res.status);
        const data = await res.json();
        console.log('Login Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Login error:', err.message);
    }
}

testLogin();
