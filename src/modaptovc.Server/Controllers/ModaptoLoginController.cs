using Microsoft.AspNetCore.Mvc;

namespace modaptovc.Server.Controllers;

[ApiController]
public partial class ModaptoLoginController : ControllerBase
{
    public ModaptoLoginController(ILogger<ModaptoLoginController> logger)
    {
        m_logger = logger;
    }

    private readonly ILogger<ModaptoLoginController> m_logger;
}
