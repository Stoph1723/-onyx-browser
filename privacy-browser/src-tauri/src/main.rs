#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use tauri::{
    menu::{Menu, MenuItem},
    Manager, Runtime, WebviewWindowBuilder,
};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FsExt;
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_store::StoreExt;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod adblock_engine;
mod privacy;
mod tabs;
mod bookmarks;
mod history;
mod downloads;
mod settings;
mod password_manager;
mod scriptlet_engine;
mod sync;
mod extensions;
mod ai_assistant;

use adblock_engine::AdblockEngine;
use privacy::PrivacyManager;
use tabs::TabManager;
use bookmarks::BookmarkManager;
use history::HistoryManager;
use downloads::DownloadManager;
use settings::SettingsManager;
use password_manager::{PasswordManager, PasswordEntry, CreditCardEntry, IdentityEntry, SecureNoteEntry};
use scriptlet_engine::{ScriptletEngine, Scriptlet, ScriptRunAt};
use sync::SyncManager;
use extensions::ExtensionManager;
use ai_assistant::AIAssistant;

#[derive(Debug, Default)]
struct AppState {
    adblock_engine: Arc<Mutex<AdblockEngine>>,
    privacy_manager: Arc<Mutex<PrivacyManager>>,
    tab_manager: Arc<Mutex<TabManager>>,
    bookmark_manager: Arc<Mutex<BookmarkManager>>,
    history_manager: Arc<Mutex<HistoryManager>>,
    download_manager: Arc<Mutex<DownloadManager>>,
    settings_manager: Arc<Mutex<SettingsManager>>,
    password_manager: Arc<Mutex<PasswordManager>>,
    scriptlet_engine: Arc<Mutex<ScriptletEngine>>,
    sync_manager: Arc<Mutex<SyncManager>>,
    extension_manager: Arc<Mutex<ExtensionManager>>,
    ai_assistant: Arc<Mutex<AIAssistant>>,
}

#[tauri::command]
async fn get_adblock_rules(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    let engine = state.adblock_engine.lock().unwrap();
    Ok(engine.get_rules())
}

#[tauri::command]
async fn toggle_adblock(state: tauri::State<'_, AppState>, enabled: bool) -> Result<(), String> {
    let mut engine = state.adblock_engine.lock().unwrap();
    engine.set_enabled(enabled);
    Ok(())
}

#[tauri::command]
async fn update_adblock_rules(
    state: tauri::State<'_, AppState>, 
    rules: Vec<scriptlet_engine::Scriptlet>
) -> Result<(), String> {
    let mut engine = state.adblock_engine.lock().unwrap();
    engine.update_rules(rules)
}

#[tauri::command]
async fn get_blocklist_stats(state: tauri::State<'_, AppState>) -> Result<adblock_engine::BlocklistStats, String> {
    let engine = state.adblock_engine.lock().unwrap();
    Ok(engine.get_stats())
}

#[tauri::command]
async fn update_blocklists(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut engine = state.adblock_engine.lock().unwrap();
    engine.update_filter_lists().await
}

#[tauri::command]
async fn create_tab(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    tab_id: String,
    url: String,
    is_private: bool,
) -> Result<(), String> {
    let mut manager = state.tab_manager.lock().unwrap();
    manager.create_tab(&app, tab_id, url, is_private).await
}

#[tauri::command]
async fn close_tab(state: tauri::State<'_, AppState>, tab_id: String) -> Result<(), String> {
    let mut manager = state.tab_manager.lock().unwrap();
    manager.close_tab(tab_id).await
}

#[tauri::command]
async fn set_active_tab(state: tauri::State<'_, AppState>, tab_id: String) -> Result<(), String> {
    let mut manager = state.tab_manager.lock().unwrap();
    manager.set_active_tab(tab_id)
}

#[tauri::command]
async fn navigate_tab(state: tauri::State<'_, AppState>, tab_id: String, url: String) -> Result<(), String> {
    let manager = state.tab_manager.lock().unwrap();
    manager.navigate_tab(tab_id, url).await
}

#[tauri::command]
async fn go_back(state: tauri::State<'_, AppState>, tab_id: String) -> Result<(), String> {
    let manager = state.tab_manager.lock().unwrap();
    manager.go_back(tab_id).await
}

#[tauri::command]
async fn go_forward(state: tauri::State<'_, AppState>, tab_id: String) -> Result<(), String> {
    let manager = state.tab_manager.lock().unwrap();
    manager.go_forward(tab_id).await
}

#[tauri::command]
async fn reload_tab(state: tauri::State<'_, AppState>, tab_id: String, force: Option<bool>) -> Result<(), String> {
    let manager = state.tab_manager.lock().unwrap();
    manager.reload_tab(tab_id, force.unwrap_or(false)).await
}

#[tauri::command]
async fn get_bookmarks(state: tauri::State<'_, AppState>) -> Result<Vec<bookmarks::Bookmark>, String> {
    let manager = state.bookmark_manager.lock().unwrap();
    Ok(manager.get_all())
}

#[tauri::command]
async fn add_bookmark(
    state: tauri::State<'_, AppState>, 
    bookmark: bookmarks::Bookmark
) -> Result<(), String> {
    let mut manager = state.bookmark_manager.lock().unwrap();
    manager.add(bookmark)
}

#[tauri::command]
async fn remove_bookmark(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let mut manager = state.bookmark_manager.lock().unwrap();
    manager.remove(&id)
}

#[tauri::command]
async fn get_history(state: tauri::State<'_, AppState>, limit: Option<usize>) -> Result<Vec<history::HistoryEntry>, String> {
    let manager = state.history_manager.lock().unwrap();
    Ok(manager.get_recent(limit.unwrap_or(100)))
}

#[tauri::command]
async fn clear_history(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut manager = state.history_manager.lock().unwrap();
    manager.clear()
}

#[tauri::command]
async fn get_downloads(state: tauri::State<'_, AppState>) -> Result<Vec<downloads::Download>, String> {
    let manager = state.download_manager.lock().unwrap();
    Ok(manager.get_all())
}

#[tauri::command]
async fn cancel_download(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let mut manager = state.download_manager.lock().unwrap();
    manager.cancel(&id)
}

#[tauri::command]
async fn get_settings(state: tauri::State<'_, AppState>) -> Result<settings::Settings, String> {
    let manager = state.settings_manager.lock().unwrap();
    Ok(manager.get_settings().clone())
}

#[tauri::command]
async fn update_settings(
    state: tauri::State<'_, AppState>, 
    settings: settings::Settings
) -> Result<(), String> {
    let mut manager = state.settings_manager.lock().unwrap();
    manager.update_settings(settings)
}

#[tauri::command]
async fn clear_browsing_data(
    state: tauri::State<'_, AppState>, 
    options: privacy::ClearDataOptions
) -> Result<(), String> {
    let mut manager = state.privacy_manager.lock().unwrap();
    manager.clear_data(options).await
}

#[tauri::command]
async fn get_privacy_stats(state: tauri::State<'_, AppState>) -> Result<privacy::PrivacyStats, String> {
    let manager = state.privacy_manager.lock().unwrap();
    Ok(manager.get_stats())
}

// Password Manager Commands
#[tauri::command]
async fn get_passwords(state: tauri::State<'_, AppState>) -> Result<Vec<password_manager::PasswordEntry>, String> {
    let pm = state.password_manager.lock().unwrap();
    Ok(pm.get_passwords().clone())
}

#[tauri::command]
async fn add_password(
    state: tauri::State<'_, AppState>,
    entry: password_manager::PasswordEntry
) -> Result<(), String> {
    let mut pm = state.password_manager.lock().unwrap();
    pm.add_password(entry)
}

#[tauri::command]
async fn get_credit_cards(state: tauri::State<'_, AppState>) -> Result<Vec<password_manager::CreditCardEntry>, String> {
    let pm = state.password_manager.lock().unwrap();
    Ok(pm.get_credit_cards().clone())
}

#[tauri::command]
async fn add_credit_card(
    state: tauri::State<'_, AppState>,
    entry: password_manager::CreditCardEntry
) -> Result<(), String> {
    let mut pm = state.password_manager.lock().unwrap();
    pm.add_credit_card(entry)
}

#[tauri::command]
async fn get_identities(state: tauri::State<'_, AppState>) -> Result<Vec<password_manager::IdentityEntry>, String> {
    let pm = state.password_manager.lock().unwrap();
    Ok(pm.get_identities().clone())
}

#[tauri::command]
async fn add_identity(
    state: tauri::State<'_, AppState>,
    entry: password_manager::IdentityEntry
) -> Result<(), String> {
    let mut pm = state.password_manager.lock().unwrap();
    pm.add_identity(entry)
}

#[tauri::command]
async fn get_secure_notes(state: tauri::State<'_, AppState>) -> Result<Vec<password_manager::SecureNoteEntry>, String> {
    let pm = state.password_manager.lock().unwrap();
    Ok(pm.get_secure_notes().clone())
}

#[tauri::command]
async fn add_secure_note(
    state: tauri::State<'_, AppState>,
    entry: password_manager::SecureNoteEntry
) -> Result<(), String> {
    let mut pm = state.password_manager.lock().unwrap();
    pm.add_secure_note(entry)
}

#[tauri::command]
async fn generate_password(
    state: tauri::State<'_, AppState>,
    length: usize,
    include_uppercase: bool,
    include_lowercase: bool,
    include_numbers: bool,
    include_symbols: bool,
) -> Result<String, String> {
    let pm = state.password_manager.lock().unwrap();
    Ok(pm.generate_password(length, include_uppercase, include_lowercase, include_numbers, include_symbols))
}

#[tauri::command]
async fn check_password_strength(
    state: tauri::State<'_, AppState>,
    password: String,
) -> Result<password_manager::PasswordStrength, String> {
    let pm = state.password_manager.lock().unwrap();
    Ok(pm.check_password_strength(&password))
}

#[tauri::command]
async fn export_vault(
    state: tauri::State<'_, AppState>,
    master_password: String,
) -> Result<String, String> {
    let pm = state.password_manager.lock().unwrap();
    Ok(pm.export_vault(&master_password)?)
}

#[tauri::command]
async fn import_vault(
    state: tauri::State<'_, AppState>,
    master_password: String,
    data: String,
) -> Result<(), String> {
    let mut pm = state.password_manager.lock().unwrap();
    pm.import_vault(&master_password, &data)
}

async fn create_main_window(app: &tauri::AppHandle) -> Result<tauri::WebviewWindow, Box<dyn std::error::Error>> {
    let window = WebviewWindowBuilder::new(
        app,
        "main",
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("Onyx")
    .inner_size(1280.0, 720.0)
    .min_inner_size(800.0, 600.0)
    .center()
    .resizable(true)
    .decorations(false)
    .transparent(false)
    .visible(true)
    .build()?;
    
    Ok(window)
}

fn setup_logging() -> Result<(), Box<dyn std::error::Error>> {
    let log_dir = dirs::data_dir()
        .ok_or("Could not find data directory")?
        .join("onyx-browser")
        .join("logs");
    
    std::fs::create_dir_all(&log_dir)?;
    
    let file_appender = tracing_appender::rolling::daily(log_dir, "app.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);
    
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(non_blocking)
                .with_ansi(false)
                .with_thread_ids(true)
                .with_thread_names(true)
                .with_file(true)
                .with_line_number(true)
        )
        .init();
    
    Ok(())
}

fn main() {
    if let Err(e) = setup_logging() {
        eprintln!("Failed to setup logging: {}", e);
    }

    let app_state = AppState::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new()
            .targets([
                Target::new(TargetKind::Stdout),
                Target::new(TargetKind::LogDir { file_name: Some("onyx-browser.log".to_string()) }),
            ])
            .build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            get_adblock_rules,
            toggle_adblock,
            update_adblock_rules,
            get_blocklist_stats,
            update_blocklists,
            create_tab,
            close_tab,
            set_active_tab,
            navigate_tab,
            go_back,
            go_forward,
            reload_tab,
            get_bookmarks,
            add_bookmark,
            remove_bookmark,
            get_history,
            clear_history,
            get_downloads,
            cancel_download,
            get_settings,
            update_settings,
            clear_browsing_data,
            get_privacy_stats,
            get_passwords,
            add_password,
            get_credit_cards,
            add_credit_card,
            get_identities,
            add_identity,
            get_secure_notes,
            add_secure_note,
            generate_password,
            check_password_strength,
            export_vault,
            import_vault,
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            tauri::async_runtime::spawn(async move {
                if let Err(e) = create_main_window(&app_handle).await {
                    tracing::error!("Failed to create main window: {}", e);
                }
            });

            let settings_manager = app.state::<AppState>().settings_manager.clone();
            {
                let mut manager = settings_manager.lock().unwrap();
                if let Err(e) = manager.load() {
                    tracing::warn!("Failed to load settings: {}", e);
                }
            }

            let adblock_engine = app.state::<AppState>().adblock_engine.clone();
            {
                let mut engine = adblock_engine.lock().unwrap();
                if let Err(e) = engine.initialize().await {
                    tracing::error!("Failed to initialize adblock engine: {}", e);
                }
            }

            let privacy_manager = app.state::<AppState>().privacy_manager.clone();
            {
                let mut manager = privacy_manager.lock().unwrap();
                if let Err(e) = manager.initialize() {
                    tracing::warn!("Failed to initialize privacy manager: {}", e);
                }
            }

            let bookmark_manager = app.state::<AppState>().bookmark_manager.clone();
            {
                let mut manager = bookmark_manager.lock().unwrap();
                if let Err(e) = manager.load() {
                    tracing::warn!("Failed to load bookmarks: {}", e);
                }
            }

            let history_manager = app.state::<AppState>().history_manager.clone();
            {
                let mut manager = history_manager.lock().unwrap();
                if let Err(e) = manager.load() {
                    tracing::warn!("Failed to load history: {}", e);
                }
            }

            let download_manager = app.state::<AppState>().download_manager.clone();
            {
                let mut manager = download_manager.lock().unwrap();
                if let Err(e) = manager.load() {
                    tracing::warn!("Failed to load downloads: {}", e);
                }
            }

            #[cfg(target_os = "macos")]
            {
                use tauri::menu::{Menu, MenuItem};
                let menu = Menu::new(&app_handle)?;
                let app_menu = Menu::new(&app_handle)?;
                let quit_item = MenuItem::with_id(&app_handle, "quit", "Quit Onyx", true, None::<String>)?;
                app_menu.append(&quit_item)?;
                menu.append_submenu(&MenuItem::Submenu {
                    id: "app".to_string(),
                    label: "Onyx".to_string(),
                    menu: app_menu,
                    enabled: true,
                    accelerator: None,
                })?;
                app_handle.set_menu(menu)?;
                app_handle.on_menu_event(move |app, event| {
                    if event.id == "quit" {
                        app.exit(0);
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}