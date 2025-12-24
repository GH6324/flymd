// flymd 桌面端入口（Tauri 2）
// Android/iOS 由 `src/lib.rs` 的 `#[cfg_attr(mobile, tauri::mobile_entry_point)]` 接管

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  flymd::run();
}
