const url = "http://localhost:4004/odata/v4/srm/Fournisseurs?$filter=tolower(email) eq 'sadekiskounen@gmail.com'&$expand=bp";
fetch(url)
.then(async r => {
  console.log("Status:", r.status);
  const data = await r.json();
  console.log("Response:", JSON.stringify(data, null, 2));
})
.catch(console.error);
