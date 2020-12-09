$inputVersionShared = "$(versionShared)";
$inputVersionCli = "$(versionCli)";

$inputUpdateShared = "$(updateShared)";
$inputUpdateCli = "$(updateCli)";


Write-output "test"
Write-output " inputVersionShared: $inputVersionShared"
Write-output " inputVersionCli: $inputVersionCli"
Write-output " inputupdateShared: $inputUpdateShared"
Write-output " inputupdateCli: $inputUpdateCli"

$updateShared = [System.Convert]::ToBoolean($inputupdateShared);
$updateCli = [System.Convert]::ToBoolean($inputupdateCli);

$sharedVersion = '';
$cliVersion = '';

if ($updateShared) {   
    if (-not [string]::IsNullOrEmpty($inputVersionShared) -and $inputVersionShared -ne '0.0.0') {
        $sharedVersion = $inputVersionShared
        Write-Output "NEW SHARED VERSION: $sharedVersion"
    }
    else {
        $sharedVersion = ((yarn info @gah/shared --json version) | Out-String | ConvertFrom-Json).data
        Write-Output "CURRENT SHARED VERSION: $sharedVersion"
        $sharedVersion = $sharedVersion.Split('.')[0] + "." + $sharedVersion.Split('.')[1] + "." + ([int]$sharedVersion.Split('.')[2] + 1)
        Write-Output "NEW SHARED VERSION: $sharedVersion"
    }
}
else {
    $sharedVersion = ((yarn info @gah/shared --json version) | Out-String | ConvertFrom-Json).data
}

if ($updateCli) {   
    if (-not [string]::IsNullOrEmpty($inputVersionCli) -and $inputVersionCli -ne '0.0.0') {
        $cliVersion = $inputVersionCli
        Write-Output "NEW SHARED VERSION: $cliVersion"
    }
    else {
        $cliVersion = ((yarn info @gah/cli --json version) | Out-String | ConvertFrom-Json).data
        Write-Output "CURRENT CLI VERSION: $cliVersion"
        $cliVersion = $cliVersion.Split('.')[0] + "." + $cliVersion.Split('.')[1] + "." + ([int]$cliVersion.Split('.')[2] + 1)
        Write-Output "NEW CLI VERSION: $cliVersion"
    }
}
else {
    $cliVersion = ((yarn info @gah/cli --json version) | Out-String | ConvertFrom-Json).data
}

"//registry.npmjs.org/:_authToken=$env:NPM_AUTH_TOKEN" | Out-File .npmrc -Encoding utf8

if ($updateShared) {  
    yarn publish ./gah-shared --new-version $sharedVersion
}

if ($updateCli) {
    $pkgJsonCli = Get-Content -Raw -Path ./gah/package.json | ConvertFrom-Json
    
    $pkgJsonCli.dependencies.'@gah/shared' = $sharedVersion;
    
    $pkgJsonCli | ConvertTo-Json -depth 2 | Out-File ./gah/package.json -Encoding utf8
    
    yarn publish ./gah --new-version $cliVersion
}


Write-Host "##vso[task.setvariable variable=newSharedVersion;isOutput=true]$sharedVersion"
Write-Host "##vso[task.setvariable variable=newCliVersion;isOutput=true]$cliVersion"
