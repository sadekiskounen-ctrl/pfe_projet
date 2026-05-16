namespace pme.registration;

using { cuid, managed } from '@sap/cds/common';

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

    isReentry   : Boolean default false; // Flag pour les ré-inscriptions après rejet

    // Infos communes
    companyName : String(100);
    email       : String(100);
    phone       : String(30);
    address     : String(200);
    password    : String(100);

    // Identifiants fiscaux Algériens
    rc          : LargeBinary @Core.MediaType: rcType;
    rcType      : String @Core.IsMediaType;
    rcName      : String;
    rcNumber    : String(20); // Ancien RC

    nif         : String(20); // Numéro Identification Fiscale
    tvaNumber   : String(30); // NIS ou TVA
    
    ai          : String(20); // Article d'Imposition
    aiDoc       : LargeBinary @Core.MediaType: aiType;
    aiType      : String @Core.IsMediaType;
    aiName      : String;

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
