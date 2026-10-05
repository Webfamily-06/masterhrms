Add-Type -AssemblyName System.Drawing
try {
    $src = Resolve-Path "public/logo.webp"
    $dst = Join-Path (Resolve-Path "public") "logo.png"
    $img = [System.Drawing.Image]::FromFile($src)
    $img.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    Write-Output "Successfully saved logo.png"
} catch {
    Write-Output "Error: $($_.Exception.Message)"
}
