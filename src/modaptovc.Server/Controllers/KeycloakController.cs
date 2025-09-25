using System.Text;
using Microsoft.AspNetCore.Mvc;

namespace modaptovc.Server.Controllers;

[ApiController]
public partial class KeycloakController : ControllerBase
{
    public KeycloakController(ILogger<KeycloakController> logger)
    {
        string? keycloakUri = Environment.GetEnvironmentVariable("KEYCLOAK_URI");
        ArgumentNullException.ThrowIfNull(keycloakUri);

        m_logger = logger;
        m_httpClient = new HttpClient() {
            BaseAddress = new Uri(keycloakUri)
        };
    }

    [HttpPost]
    [Route("/api/validateauthtoken")]
    public async Task<IActionResult> ValidateAuthToken(string authtoken)
    {
        using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, "/realms/" + Environment.GetEnvironmentVariable("KEYCLOAK_REALM") + "/protocol/openid-connect/token/introspect") {
            Content = new StringContent("token=" + authtoken + "&client_id=" + Environment.GetEnvironmentVariable("KEYCLOAK_CLIENT_ID") + "&client_secret=" + Environment.GetEnvironmentVariable("KEYCLOAK_CLIENT_SECRET"), Encoding.UTF8, "application/x-www-form-urlencoded")
        };

        HttpResponseMessage response = await m_httpClient.SendAsync(request);
        return response.IsSuccessStatusCode ? Ok(await response.Content.ReadAsStringAsync()) : BadRequest(response);
    }

    [HttpGet]
    [Route("/api/authtoken")]
    public async Task<IActionResult> GetAuthToken()
    {
        using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, "/realms/" + Environment.GetEnvironmentVariable("KEYCLOAK_REALM") + "/protocol/openid-connect/token") {
            Content = new StringContent("grant_type=password&client_id=" + Environment.GetEnvironmentVariable("KEYCLOAK_CLIENT_ID") + "&client_secret=" + Environment.GetEnvironmentVariable("KEYCLOAK_CLIENT_SECRET") +
                "&username=" + Environment.GetEnvironmentVariable("KEYCLOAK_USERNAME") + "&password=" + Environment.GetEnvironmentVariable("KEYCLOAK_PASSWORD"), Encoding.UTF8, "application/x-www-form-urlencoded")
        };

        HttpResponseMessage response = await m_httpClient.SendAsync(request);
        return response.IsSuccessStatusCode ? Ok(await response.Content.ReadAsStringAsync()) : BadRequest(response);
    }

    private readonly HttpClient m_httpClient;
    private readonly ILogger<KeycloakController> m_logger;
}
