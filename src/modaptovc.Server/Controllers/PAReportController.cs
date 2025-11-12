using System.IO.Compression;
using Microsoft.AspNetCore.Mvc;

namespace modaptovc.Server.Controllers;

[ApiController]
public partial class PAReportController : ControllerBase
{
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
    [Route("/api/{moduleId:guid}")]
    public IActionResult PAReportExists(string moduleId)
    {
        return System.IO.File.Exists(Path.Combine(toModulePath(moduleId), "index.html")) ? Ok() : NotFound();
    }

    [HttpDelete]
    [Route("/api/{moduleId:guid}")]
    public IActionResult DeletePAReport(string moduleId)
    {
        string? modulePath = toModulePath(moduleId);

        if (Path.Exists(modulePath))
            Directory.Delete(modulePath, true);

        return Ok();
    }

    [HttpGet]
    [Route("/api/{moduleId:guid}")]
    public async Task<IActionResult> GetPAReport(string moduleId)
    {
        MemoryStream memoryStream = new MemoryStream();
        using (ZipArchive zip = new ZipArchive(memoryStream, ZipArchiveMode.Create, true)) {
            string basePath = toModulePath(moduleId);
            await addFilesToZip(zip, basePath, basePath);
        }

        memoryStream.Seek(0, SeekOrigin.Begin);
        return File(memoryStream, "application/zip", $"pa-{moduleId}.zip");
    }

    [HttpPost]
    [Route("/api/{moduleId:guid}")]
    public async Task<IActionResult> PostPAReport(string moduleId, IFormFileCollection files)
    {
        string modulePath = toModulePath(moduleId);
        if (!Directory.Exists(modulePath) || !Directory.EnumerateFileSystemEntries(modulePath).Any()) {
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
                string filePath = modulePath;
                filePath += file.FileName.Replace(basePath, "");
                Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
                using FileStream fileStream = System.IO.File.OpenWrite(filePath);
                await file.CopyToAsync(fileStream);
            }
        }

        return Ok();
    }

    private static async Task addFilesToZip(ZipArchive zip, string basePath, string folderPath)
    {
        foreach (string childFolderPath in Directory.GetDirectories(folderPath)) {
            zip.CreateEntry(childFolderPath.Replace(basePath, "") + '/');
            await addFilesToZip(zip, basePath, childFolderPath);
        }

        foreach (string filePath in Directory.GetFiles(folderPath)) {
            ZipArchiveEntry entry = zip.CreateEntry(filePath.Replace(basePath, ""));
            using Stream entryStream = entry.Open();
            using FileStream fileStream = System.IO.File.OpenRead(filePath);
            await fileStream.CopyToAsync(entryStream);
        }
    }

    private static string toModulePath(string moduleId)
    {
#if DEBUG
        return $"../modaptovc.Client/public/data/pa-{moduleId}/";
#else
        return $"data/pa-{moduleId}";
#endif
    }
}
