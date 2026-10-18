fn main() {
    let mut windows_attributes = tauri_build::WindowsAttributes::new();

    // Em modo release, aplica o manifesto com requireAdministrator.
    // Em modo debug (desenvolvimento), aplica asInvoker para permitir que 'npm run tauri dev'
    // execute sem exigir que o editor/IDE esteja rodando com privilégios de Administrador.
    let is_release = std::env::var("PROFILE").map(|p| p == "release").unwrap_or(false);

    if is_release {
        windows_attributes = windows_attributes.app_manifest(include_str!("app.manifest.release"));
    } else {
        windows_attributes = windows_attributes.app_manifest(include_str!("app.manifest.debug"));
    }
    
    tauri_build::try_build(
        tauri_build::Attributes::new().windows_attributes(windows_attributes)
    ).expect("failed to run tauri-build");
}
