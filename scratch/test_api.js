(async () => {
    try {
        const auth = 'Basic ' + Buffer.from('client:client').toString('base64');
        const res = await fetch('http://localhost:4004/odata/v4/crm/ClientsB2C', {
            headers: { 'Authorization': auth }
        });
        console.log('HTTP Status:', res.status);
        const data = await res.json();
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
})();
