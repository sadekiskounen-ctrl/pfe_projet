(async () => {
    try {
        const auth = 'Basic ' + Buffer.from('client:client').toString('base64');
        const headers = { 'Authorization': auth };
        
        console.log("1. Fetch B2C Client Details:");
        const email = 'ahmed.benali@gmail.com';
        const clientRes = await fetch(`http://localhost:4004/odata/v4/crm/ClientsB2C?$filter=tolower(email) eq '${email.toLowerCase()}'`, { headers });
        console.log("Client Status:", clientRes.status);
        if(!clientRes.ok) return console.log(await clientRes.text());
        const clientData = await clientRes.json();
        const clientProfile = clientData.value[0];
        console.log("Profile loaded:", clientProfile.ID, clientProfile.bp_ID);

        console.log("\n2. Fetch BusinessPartner:");
        // Using quotes just in case, but CAP might not strictly need it for valid UUIDs, let's see.
        const bpRes = await fetch(`http://localhost:4004/odata/v4/crm/BusinessPartners(${clientProfile.bp_ID})`, { headers });
        console.log("BP Status:", bpRes.status);
        if(!bpRes.ok) console.log(await bpRes.text());
        else {
            const bpData = await bpRes.json();
            console.log("BP loaded:", bpData.bpNumber);
        }

        console.log("\n3. Fetch Products:");
        const prodRes = await fetch(`http://localhost:4004/odata/v4/crm/Produits?$filter=isActive eq true`, { headers });
        console.log("Products Status:", prodRes.status);
        const prodData = await prodRes.json();
        console.log("Products length:", prodData.value.length);

        console.log("\n4. Fetch Devis:");
        const devisRes = await fetch(`http://localhost:4004/odata/v4/crm/Devis?$filter=clientB2C_ID eq ${clientProfile.ID}&$expand=items`, { headers });
        console.log("Devis Status:", devisRes.status);
        if(!devisRes.ok) console.log(await devisRes.text());
        else {
            const devisData = await devisRes.json();
            console.log("Devis length:", devisData.value.length);
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
})();
