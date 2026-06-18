$node = "C:\Users\mathieu.girardin_tii\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$vite = Join-Path $PSScriptRoot "node_modules\vite\bin\vite.js"
$port = 4174

if (-not (Test-Path $node)) {
  Write-Error "Node runtime introuvable: $node"
  exit 1
}

if (-not (Test-Path $vite)) {
  Write-Error "Vite introuvable. Lance d'abord: npm install"
  exit 1
}

& $node $vite preview --host 0.0.0.0 --port $port
