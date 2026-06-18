async function test() {
  const urls = [
    'https://5ad225cetrial-dev-gestion-pme-srv.cfapps.us10-001.hana.ondemand.com/',
    'https://5ad225cetrial-dev-gestion-pme-srv.cfapps.us10-001.hana.ondemand.com/odata/v4/registration/$metadata',
    'https://client-pme-5ad225cetrial.cfapps.us10-001.hana.ondemand.com/',
    'https://admin-pme-5ad225cetrial.cfapps.us10-001.hana.ondemand.com/'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      console.log(`URL: ${url}`);
      console.log(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log(`Length: ${text.length} chars`);
      console.log(`Sample: ${text.substring(0, 150)}\n`);
    } catch (err) {
      console.error(`Error for ${url}:`, err.message);
    }
  }
}

test();
