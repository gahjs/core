$newCliVersion = "v0.1.3"
$newSharedVersion = "v0.1.0"
$sourceVersion = "5d8f1a76753a6fe9c42ecee3c5f8e7e075504715"

# $newCliVersion = "v$env:releasescript_newCliVersion"
# $newCliVersion = "v$env:releasescript_newSharedVersion"
# $sourceVersion = "$env:Build_SourceVersion"
$now = Get-Date -Format "MM\/dd\/yyyy"

$releaseTemplate = Get-Content -Raw -Path release-template.txt

$releaseTemplate = $releaseTemplate.Replace('{{tag}}', $newCliVersion).Replace('{{date}}', $now).Replace('{{tag-shared}}', $newSharedVersion)

$env:GITHUB_TOKEN = "c4d44ad8d969ec14ac6079901d4664a742f766ce";

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
