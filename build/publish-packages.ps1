
$sharedVersion = '';
$cliVersion = '';

if (-not [string]::IsNullOrEmpty("$evn:versionShared") -and "$evn:versionShared" -ne '0.0.0') {
    $sharedVersion = "$evn:versionShared"
    Write-Output "NEW SHARED VERSION: $sharedVersion"
}
else {
    $sharedVersion = ((yarn info @awdware/gah-shared --json version) | Out-String | ConvertFrom-Json).data
    Write-Output "CURRENT SHARED VERSION: $sharedVersion"
    $sharedVersion = $sharedVersion.Split('.')[0] + "." + $sharedVersion.Split('.')[1] + "." + ([int]$sharedVersion.Split('.')[2] + 1)
    Write-Output "NEW SHARED VERSION: $sharedVersion"
}

if (-not [string]::IsNullOrEmpty("$(versionCli)") -and "$(versionCli)" -ne '0.0.0') {
    $cliVersion = "$(versionCli)"
    Write-Output "NEW SHARED VERSION: $cliVersion"
}
else {
    $cliVersion = ((yarn info @awdware/gah --json version) | Out-String | ConvertFrom-Json).data
    Write-Output "CURRENT CLI VERSION: $cliVersion"
    $cliVersion = $cliVersion.Split('.')[0] + "." + $cliVersion.Split('.')[1] + "." + ([int]$cliVersion.Split('.')[2] + 1)
    Write-Output "NEW CLI VERSION: $cliVersion"
}

##yarn publish ./gah-shared --new-version $sharedVersion



$pkgJsonCli = Get-Content -Raw -Path ./gah/package.json | ConvertFrom-Json

$pkgJsonCli.dependencies.'@awdware/gah-shared' = $sharedVersion;

$pkgJsonCli | ConvertTo-Json -depth 2 | Out-File ./gah/package.json -Encoding utf8

## yarn publish ./gah --new-version $cliVersion


Write-Host "##vso[task.setvariable variable=newSharedVersion;isOutput=true]$sharedVersion"
Write-Host "##vso[task.setvariable variable=newCliVersion;isOutput=true]$cliVersion"
