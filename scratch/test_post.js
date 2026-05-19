(async () => {
  const payload = {
    type: "FOURNISSEUR",
    companyName: "Youcef Tech",
    rcNumber: "99/99-1234567B99",
    nif: "999999999999999",
    ai: "99999999999",
    ribNumber: "99999999999999999999",
    email: "youcef@gmail.com",
    phone: "0799999999",
    password: "password123",
    address: "Alger",
    sector: "Informatique & Tech",
    rc: "JVBERi0xLjMKJf////8KNyAwIG9iago=",
    rcType: "application/pdf",
    rcName: "rc.pdf",
    rib: "JVBERi0xLjMKJf////8KNyAwIG9iago=",
    ribType: "application/pdf",
    ribName: "rib.pdf",
    aiDoc: "JVBERi0xLjMKJf////8KNyAwIG9iago=",
    aiType: "application/pdf",
    aiName: "ai.pdf",
    nifDoc: "JVBERi0xLjMKJf////8KNyAwIG9iago=",
    nifType: "application/pdf",
    nifName: "nif.pdf"
  };

  try {
    const res = await fetch("http://localhost:4004/odata/v4/registration/SubmitRegistration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log("Status:", res.status);
    console.log("Response:", await res.json());
  } catch (e) {
    console.error(e);
  }
})();
