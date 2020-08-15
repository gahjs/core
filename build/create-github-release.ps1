$newCliVersion = "v$env:releasescript_newCliVersion"
$newCliVersion = "v$env:releasescript_newSharedVersion"
$sourceVersion = "$env:Build_SourceVersion"
$now = Get-Date -Format "MM\/dd\/yyyy"

$releaseTemplate = Get-Content -Raw -Path release-template.txt

$releaseTemplate = $releaseTemplate.Replace('{{tag}}', $newCliVersion).Replace('{{date}}', $now).Replace('{{tag-shared}}', $newSharedVersion)

$postHeaders = @{
  Authorization = "token $env:GITHUB_TOKEN"; 
}

$postParams = @{
  tag_name         = "$newCliVersion";
  target_commitish = "$sourceVersion";
  name             = "$newCliVersion"; 
  body             = "$releaseTemplate"; 
  draft            = $true;
} | ConvertTo-Json

Write-Host ($postParams | ConvertTo-Json)

Invoke-WebRequest -Uri https://api.github.com/repos/awdware/gah/releases -Method POST -Headers $postHeaders -Body $postParams
