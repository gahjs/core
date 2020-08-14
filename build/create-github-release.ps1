$newCliVersion = "v$env:releasescript_newCliVersion"
$sourceVersion = "$env:Build_SourceVersion"
$date = Get-Date -Format "MM/dd/yyyy"

git clone https://github.com/awdware/gah.git

brew install hub

Set-Location gah

$releaseTemplate = Get-Content -Raw -Path ./build/release-template.txt

$releaseTemplate = $releaseTemplate.Replace('{{tag}}', $newCliVersion).Replace('{{date}}', $date);
$releaseTemplate | Out-File ./build/release-template.txt -Encoding utf8

$env:GITHUB_TOKEN = "$(GITHUB_TOKEN)"
$env:GITHUB_USER = "$(GITHUB_USER)"

hub release create $newCliVersion --draft --commitish $sourceVersion --file release-template.txt
