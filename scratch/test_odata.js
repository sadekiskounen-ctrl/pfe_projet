(async () => {
    try {
        const auth = 'Basic ' + Buffer.from('client:client').toString('base64');
        const headers = { 'Authorization': auth };
        
        console.log("1. Test without quotes:");
        const res1 = await fetch('http://localhost:4004/odata/v4/crm/BusinessPartners(bp-004)', { headers });
        console.log("Status:", res1.status);
        if(!res1.ok) console.log(await res1.text());

        console.log("\n2. Test with quotes:");
        const res2 = await fetch("http://localhost:4004/odata/v4/crm/BusinessPartners('bp-004')", { headers });
        console.log("Status:", res2.status);
        
        console.log("\n3. Test devis without quotes:");
        const res3 = await fetch('http://localhost:4004/odata/v4/crm/Devis?$filter=clientB2C_ID eq cb2c-001', { headers });
        console.log("Status:", res3.status);
        if(!res3.ok) console.log(await res3.text());

    } catch (e) {
        console.error('Error:', e.message);
    }
})();
