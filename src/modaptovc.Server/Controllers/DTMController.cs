using Microsoft.AspNetCore.Mvc;

namespace modaptovc.Server.Controllers;

[ApiController]
public partial class DTMController : ControllerBase
{
    public DTMController(ILogger<DTMController> logger)
    {
        m_logger = logger;
    }

    private readonly ILogger<DTMController> m_logger;
}
