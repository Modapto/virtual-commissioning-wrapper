namespace modaptovc.Server;

public class VCConfig
{
    public string DTMUri { get; } = Environment.GetEnvironmentVariable("DTM_URI") ?? throw new ArgumentNullException("DTM_URI");
    public string? ModaptoUri { get; } = Environment.GetEnvironmentVariable("MODAPTO_URI");
}
