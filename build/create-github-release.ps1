$newCliVersion = "v$env:releasescript_newCliVersion"
$newCliVersion = "v$env:releasescript_newSharedVersion"
$sourceVersion = "$env:Build_SourceVersion"
$now = Get-Date -Format "MM\/dd\/yyyy"

Write-Host $now

brew install hub

git clone https://github.com/awdware/gah.git
Set-Location gah

$releaseTemplate = Get-Content -Raw -Path .\build\release-template.txt

$releaseTemplate = $releaseTemplate.Replace('{{tag}}', $newCliVersion).Replace('{{date}}', $now).Replace('{{tag-shared}}', $newSharedVersion);
$releaseTemplate | Out-File .\build\release-template.txt -Encoding utf8

$env:GITHUB_TOKEN = "$env:GITHUB_TOKEN"
$env:GITHUB_USER = "$env:GITHUB_USER"

hub release create $newCliVersion --draft --commitish $sourceVersion --file .\build\release-template.txt
