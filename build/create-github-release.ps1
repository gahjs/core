$newCliVersion = "v$env:releasescript_newCliVersion"
$sourceVersion = "$env:Build_SourceVersion"
$date = Get-Date -Format "MM/dd/yyyy"


brew install hub


$releaseTemplate = Get-Content -Raw -Path ./build/release-template.txt

$releaseTemplate = $releaseTemplate.Replace('{{tag}}', $newCliVersion).Replace('{{date}}', $date);
$releaseTemplate | Out-File ./build/release-template.txt -Encoding utf8

$env:GITHUB_TOKEN = "$env:GITHUB_TOKEN"
$env:GITHUB_USER = "$env:GITHUB_USER"

New-Item -ItemType Directory -Path gitfolder
Set-Location gitfolder
git clone https://github.com/awdware/gah.git
Set-Location gah
hub release create $newCliVersion --draft --commitish $sourceVersion --file ../../build/release-template.txt
