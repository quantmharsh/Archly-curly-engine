$ErrorActionPreference = 'Stop'
$path = Resolve-Path (Join-Path $PSScriptRoot '..\..\docs\agent-handoff.md')
$text = [IO.File]::ReadAllText($path)
$next = @'
## Next Recommended Task

Manually verify that the account's last-open canvas restores after refresh and login in a second browser/device. Include a user with an existing account preference and local guest canvases awaiting transfer, and check that the transfer prompt does not replace the restored account canvas. Also verify deleting the preferred account canvas falls back to another account canvas. Then recheck account autosave and the long saved-canvas list. Do not run automated tests until the user authorizes them.

'@
$text = $text -replace '(?ms)^## Next Recommended Task\r?\n\r?\n.*?(?=^## Important Context)', $next
[IO.File]::WriteAllText($path, $text, [Text.UTF8Encoding]::new($false))
Write-Output 'Updated handoff next step.'
