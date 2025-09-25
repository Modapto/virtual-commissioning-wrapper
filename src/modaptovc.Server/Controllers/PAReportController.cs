using System.IO.Compression;
using Microsoft.AspNetCore.Mvc;

namespace modaptovc.Server.Controllers;

[ApiController]
public partial class PAReportController : ControllerBase
{
    public PAReportController(ILogger<PAReportController> logger)
    {
        m_logger = logger;
    }

    [HttpHead]
    [Route("/api/healthy")]
    public IActionResult Healthy()
    {
        return Ok();
    }

    [HttpGet]
    [Route("/api/config")]
    public IActionResult GetConfig()
    {
        return Ok(new VCConfig());
    }

    [HttpHead]
    [Route("/api/{moduleId}")]
    public IActionResult PAReportExists(string moduleId)
    {
        return System.IO.File.Exists(Path.Combine(toModulePath(moduleId), "index.html")) ? Ok() : NotFound();
    }

    [HttpDelete]
    [Route("/api/{moduleId}")]
    public IActionResult DeletePAReport(string moduleId)
    {
        string modulePath = toModulePath(moduleId);
        if (Path.Exists(modulePath))
            Directory.Delete(modulePath, true);

        return Ok();
    }

    [HttpGet]
    [Route("/api/{moduleId}")]
    public async Task<IActionResult> GetPAReport(string moduleId)
    {
        MemoryStream memoryStream = new MemoryStream();
        using (ZipArchive zip = new ZipArchive(memoryStream, ZipArchiveMode.Create, true)) {
            string basePath = toModulePath(moduleId);
            addFilesToZip(zip, basePath, basePath);
        }

        memoryStream.Seek(0, SeekOrigin.Begin);
        return File(memoryStream, "application/zip", $"pa-{moduleId}.zip");
    }

    [HttpPost]
    [Route("/api/{moduleId}")]
    public async Task<IActionResult> PostPAReport(string moduleId, IFormFileCollection files)
    {
        //what if already exists
        //what if id is invalid
        string basePath = "";
        if (files.Count != 0) {
            string[] filePathParts = files[0].FileName.Split('/')[..^1];
            if ((files.All(f => f.FileName.StartsWith(filePathParts[0], StringComparison.InvariantCulture)))) {
                basePath = filePathParts[0];
                for (int i = 1; i < filePathParts.Length; i++) {
                    if (files.All(f => f.FileName.StartsWith($"{basePath}/{filePathParts[i]}", StringComparison.InvariantCulture)))
                        basePath += $"/{filePathParts[i]}";
                }
            }
        }

        foreach (IFormFile file in files) {
            string filePath = toModulePath(moduleId);
            filePath += file.FileName.Replace(basePath, "");
            Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
            using FileStream fileStream = System.IO.File.OpenWrite(filePath);
            await file.CopyToAsync(fileStream);
        }

        return Ok();
    }

    private static void addFilesToZip(ZipArchive zip, string basePath, string folderPath)
    {
        foreach (string childFolderPath in Directory.GetDirectories(folderPath)) {
            zip.CreateEntry(childFolderPath.Replace(basePath, "") + '/');
            addFilesToZip(zip, basePath, childFolderPath);
        }

        foreach (string filePath in Directory.GetFiles(folderPath)) {
            ZipArchiveEntry entry = zip.CreateEntry(filePath.Replace(basePath, ""));
            using Stream entryStream = entry.Open();
            using FileStream fileStream = System.IO.File.OpenRead(filePath);
            fileStream.CopyTo(entryStream);
        }
    }

    private static string toModulePath(string? moduleId)
    {
#if DEBUG
        string filePath = "../modaptovc.Client/public/data/";
#else
        string filePath = $"data/";
#endif
        if (!string.IsNullOrEmpty(moduleId))
            filePath += $"pa-{moduleId}/";
        return filePath;
    }

    private readonly ILogger<PAReportController> m_logger;
}
