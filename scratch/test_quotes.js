(async () => {
    try {
        const auth = 'Basic ' + Buffer.from('client:client').toString('base64');
        const headers = { 'Authorization': auth };
        
        console.log("Test BP WITH quotes:");
        const res1 = await fetch("http://localhost:4004/odata/v4/crm/BusinessPartners('bp-004')", { headers });
        console.log("Status:", res1.status);
        if(!res1.ok) console.log(await res1.text());
        else console.log("BP data loaded.");

        console.log("\nTest BP WITHOUT quotes:");
        const res2 = await fetch("http://localhost:4004/odata/v4/crm/BusinessPartners(bp-004)", { headers });
        console.log("Status:", res2.status);
        if(!res2.ok) console.log(await res2.text());
        else console.log("BP data loaded.");

    } catch (e) {
        console.error('Error:', e.message);
    }
})();
