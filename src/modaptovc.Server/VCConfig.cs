namespace modaptovc.Server;

public class VCConfig
{
    public string DTMUri { get; } = Environment.GetEnvironmentVariable("DTM_URI") ?? throw new ArgumentNullException("DTM_URI");
    public string KeycloakClientId { get; } = Environment.GetEnvironmentVariable("KEYCLOAK_CLIENT_ID") ?? throw new ArgumentNullException("KEYCLOAK_CLIENT_ID");
    public string KeycloakClientSecret { get; } = Environment.GetEnvironmentVariable("KEYCLOAK_CLIENT_SECRET") ?? throw new ArgumentNullException("KEYCLOAK_CLIENT_SECRET");
    public string? KeycloakRealm { get; } = Environment.GetEnvironmentVariable("KEYCLOAK_REALM");
    public string? KeycloakUsername { get; } = Environment.GetEnvironmentVariable("KEYCLOAK_USERNAME");
    public string? KeycloakPassword { get; } = Environment.GetEnvironmentVariable("KEYCLOAK_PASSWORD");
    public string KeycloakUri { get; } = Environment.GetEnvironmentVariable("KEYCLOAK_URI") ?? throw new ArgumentNullException("KEYCLOAK_URI");
    public string? ModaptoLoginUri { get; } = Environment.GetEnvironmentVariable("MODAPTO_LOGIN_URI");
}
