using {pme.registration as db} from '../../db/index';

@path: '/odata/v4/registration'
@auth: 'none'
service RegistrationService {

    @insertonly
    entity SubmitRegistration   as projection on db.RegistrationRequest;

    // L'admin pourra voir et valider ces requêtes via le service Admin
    @readonly
    @requires: 'Admin'
    entity RegistrationRequests as projection on db.RegistrationRequest;

    @requires: 'Admin'
    action   approveRegistration(id: db.RegistrationRequest:ID)                  returns String;
    @requires: 'Admin'
    action   rejectRegistration(id: db.RegistrationRequest:ID, reason: String)   returns String;

    type StatusResponse {
        status      : String;
        blockReason : String;
    }

    function checkStatus(email: String)                                          returns StatusResponse;
    function checkAvailability(
        email: String, 
        companyName: String, 
        type: String,
        rcNumber: String,
        nif: String,
        ai: String,
        ribNumber: String,
        phone: String
    ) returns StatusResponse;
    action   login(email: String, password: String)                              returns StatusResponse;
}
