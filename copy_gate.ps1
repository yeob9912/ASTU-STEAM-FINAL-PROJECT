$src = 'C:\Users\CLB\.gemini\antigravity\brain\2e9f49ab-1d71-4b1d-a7c1-64076367e71c\astu_gate_1783841965090.png'
$dst = 'C:\Users\CLB\Desktop\ASTU-STEAM-FINAL-PROJECT\frontend\public\astu_gate.png'
[System.IO.File]::Copy($src, $dst, $true)
Write-Output "Done"
