$newCliVersion = "v$env:RELEASESCRIPT_NEWCLIVERSION"
$newSharedVersion = "v$env:RELEASESCRIPT_NEWSHAREDVERSION"
$sourceVersion = "$env:BUILD_SOURCEVERSION"
$now = Get-Date -Format "MM\/dd\/yyyy"

# (gci env:*).GetEnumerator() | Sort-Object Name | Out-String

$releaseTemplate = Get-Content -Raw -Path release-template.txt

$releaseTemplate = $releaseTemplate.Replace('{{tag}}', $newCliVersion).Replace('{{date}}', $now).Replace('{{tag-shared}}', $newSharedVersion)

$gitHubToken = "$(GITHUB_TOKEN)";

$postHeaders = @{
  Authorization = "token $gitHubToken"; 
}

$postParams = @{
  tag_name         = "$newCliVersion";
  target_commitish = "$sourceVersion";
  name             = "$newCliVersion"; 
  body             = "$releaseTemplate"; 
  draft            = $true;
} | ConvertTo-Json

Write-Host $postParams

Invoke-WebRequest -Uri https://api.github.com/repos/awdware/gah/releases -Method POST -Headers $postHeaders -Body $postParams
