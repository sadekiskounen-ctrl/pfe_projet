fetch('http://localhost:4004/odata/v4/crm/Produits?$orderby=name%20asc&$top=500', {
  headers: { Authorization: 'Basic Y2xpZW50OmNsaWVudA==' }
})
.then(async r => {
  console.log("Status:", r.status);
  console.log(await r.text());
});
