(async () => {
    try {
        const auth = 'Basic ' + Buffer.from('client:client').toString('base64');
        const headers = { 'Authorization': auth };
        
        console.log("1. Test B2B BusinessPartner fetch:");
        const res1 = await fetch('http://localhost:4004/odata/v4/crm/BusinessPartners(36f7799d-963a-40af-b8cf-745760e51391)', { headers });
        console.log("Status:", res1.status);
        if(!res1.ok) console.log(await res1.text());
        else {
            const data = await res1.json();
            console.log("BP data loaded:", !!data.ID, "NIF:", data.nif);
        }

        console.log("\n2. Test Products catalog fetch:");
        const res2 = await fetch('http://localhost:4004/odata/v4/crm/Produits?$filter=isActive eq true', { headers });
        console.log("Status:", res2.status);
        if(!res2.ok) console.log(await res2.text());
        else {
            const data = await res2.json();
            console.log("Products loaded:", data.value.length);
        }
        
        console.log("\n3. Test Devis fetch:");
        const res3 = await fetch('http://localhost:4004/odata/v4/crm/Devis?$filter=clientB2B_ID eq 36f7799d-963a-40af-b8cf-745760e51391&$expand=items', { headers });
        console.log("Status:", res3.status);
        if(!res3.ok) console.log(await res3.text());
        else {
            const data = await res3.json();
            console.log("Devis loaded:", data.value.length);
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
})();
