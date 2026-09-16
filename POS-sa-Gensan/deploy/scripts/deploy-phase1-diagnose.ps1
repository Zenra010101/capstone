# Show why API health failed on production server
$Ip = "157.245.144.237"
$Script = Join-Path $PSScriptRoot "phase1-server-diagnose.sh"
scp $Script ("root@{0}:/tmp/phase1-server-diagnose.sh" -f $Ip)
ssh ("root@{0}" -f $Ip) "sed -i 's/\r$//' /tmp/phase1-server-diagnose.sh && bash /tmp/phase1-server-diagnose.sh"
