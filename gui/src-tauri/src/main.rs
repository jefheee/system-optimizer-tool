// Prevents additional console window on Windows in both debug and release when elevating via UAC
#![windows_subsystem = "windows"]

fn main() {
    app_lib::run();
}
