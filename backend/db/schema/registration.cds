namespace pme.registration;

using { cuid, managed } from '@sap/cds/common';

@assert.unique: { email: [ email ] }
entity RegistrationRequest : cuid, managed {
    type        : String(20) enum {
        CLIENT_B2B = 'CLIENT_B2B';
        FOURNISSEUR = 'FOURNISSEUR';
    };
    status      : String(20) enum {
        PENDING = 'PENDING';
        APPROVED = 'APPROVED';
        REJECTED = 'REJECTED';
    } default 'PENDING';

    // Infos communes
    companyName : String(100);
    email       : String(100);
    phone       : String(30);
    address     : String(200);

    // KYC B2B & Fournisseur
    siret       : String(14);
    tvaNumber   : String(30);

    // Documents joints (Stockés en base de données pour la simplicité, type LargeBinary)
    kbis        : LargeBinary @Core.MediaType: kbisType;
    kbisType    : String @Core.IsMediaType;
    kbisName    : String;

    rib         : LargeBinary @Core.MediaType: ribType;
    ribType     : String @Core.IsMediaType;
    ribName     : String;

    // KYC Spécifique Fournisseur
    urssaf      : LargeBinary @Core.MediaType: urssafType;
    urssafType  : String @Core.IsMediaType;
    urssafName  : String;

    rcPro       : LargeBinary @Core.MediaType: rcProType;
    rcProType   : String @Core.IsMediaType;
    rcProName   : String;

    adminComment: String; // Commentaire éventuel en cas de rejet
}
