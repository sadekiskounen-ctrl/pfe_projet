using {pme.registration as db} from '../../db/index';

@path: '/odata/v4/registration'
@auth: 'none'
service RegistrationService {

    @insertonly
    entity SubmitRegistration   as projection on db.RegistrationRequest;

    // L'admin pourra voir et valider ces requêtes via le service Admin (à sécuriser plus tard)
    @readonly
    entity RegistrationRequests as projection on db.RegistrationRequest;

    action   approveRegistration(id: db.RegistrationRequest:ID)                  returns String;
    action   rejectRegistration(id: db.RegistrationRequest:ID, reason: String)   returns String;

    type StatusResponse {
        status      : String;
        blockReason : String;
    }

    function checkStatus(email: String)                                          returns StatusResponse;
    function checkAvailability(email: String, companyName: String, type: String) returns StatusResponse;
    action   login(email: String, password: String)                              returns StatusResponse;
}
