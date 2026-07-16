use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};
use tracing::{info, warn, error, debug};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Download {
    pub id: String,
    pub url: String,
    pub filename: String,
    pub path: Option<String>,
    pub total_bytes: u64,
    pub received_bytes: u64,
    pub progress: f64,
    pub state: DownloadState,
    pub mime_type: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub error: Option<String>,
    pub referrer: String,
    pub user_agent: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DownloadState {
    Pending,
    Progressing,
    Completed,
    Cancelled,
    Interrupted,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DownloadData {
    downloads: HashMap<String, Download>,
}

pub struct DownloadManager {
    data: Arc<Mutex<DownloadData>>,
    data_dir: PathBuf,
}

impl DownloadManager {
    pub fn new() -> Self {
        let data_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("privacy-browser")
            .join("downloads");
        
        std::fs::create_dir_all(&data_dir).ok();
        
        let manager = Self {
            data: Arc::new(Mutex::new(DownloadData::default())),
            data_dir,
        };
        
        manager.load().ok();
        manager
    }

    fn load(&self) -> Result<(), String> {
        let path = self.data_dir.join("downloads.json");
        if path.exists() {
            let content = std::fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read downloads file: {}", e))?;
            let data: DownloadData = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse downloads: {}", e))?;
            *self.data.lock().unwrap() = data;
        }
        Ok(())
    }

    fn save(&self) -> Result<(), String> {
        let data = self.data.lock().unwrap();
        let path = self.data_dir.join("downloads.json");
        let content = serde_json::to_string_pretty(&*data)
            .map_err(|e| format!("Failed to serialize downloads: {}", e))?;
        std::fs::write(self.data_dir.join("downloads.json"), content)
            .map_err(|e| format!("Failed to write downloads file: {}", e))?;
        Ok(())
    }

    pub fn add(&self, download: Download) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        data.downloads.insert(download.id.clone(), download);
        drop(data);
        self.save()
    }

    pub fn update_progress(&self, id: &str, received: u64, total: u64) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        if let Some(download) = data.downloads.get_mut(id) {
            download.received_bytes = received;
            download.total_bytes = total;
            download.progress = if total > 0 {
                received as f64 / total as f64
            } else {
                0.0
            };
            download.state = DownloadState::Progressing;
        }
        drop(data);
        self.save()
    }

    pub fn update_state(&self, id: &str, state: DownloadState) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        if let Some(download) = data.downloads.get_mut(id) {
            download.state = state.clone();
            if state == DownloadState::Completed {
                download.completed_at = Some(chrono::Utc::now().to_rfc3339());
                download.progress = 1.0;
                download.received_bytes = download.total_bytes;
            }
        }
        drop(data);
        self.save()
    }

    pub fn update_path(&self, id: &str, path: String) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        if let Some(download) = data.downloads.get_mut(id) {
            download.path = Some(path);
        }
        drop(data);
        self.save()
    }

    pub fn set_error(&self, id: &str, error: String) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        if let Some(download) = data.downloads.get_mut(id) {
            download.error = Some(error);
            download.state = DownloadState::Failed;
        }
        drop(data);
        self.save()
    }

    pub fn get(&self, id: &str) -> Option<Download> {
        let data = self.data.lock().unwrap();
        data.downloads.get(id).cloned()
    }

    pub fn get_all(&self) -> Vec<Download> {
        let data = self.data.lock().unwrap();
        let mut downloads: Vec<_> = data.downloads.values().cloned().collect();
        downloads.sort_by(|a, b| b.started_at.cmp(&a.started_at));
        downloads
    }

    pub fn get_active(&self) -> Vec<Download> {
        let data = self.data.lock().unwrap();
        data.downloads.values()
            .filter(|d| matches!(d.state, DownloadState::Progressing | DownloadState::Pending))
            .cloned()
            .collect()
    }

    pub fn get_completed(&self) -> Vec<Download> {
        let data = self.data.lock().unwrap();
        data.downloads.values()
            .filter(|d| d.state == DownloadState::Completed)
            .cloned()
            .collect()
    }

    pub fn cancel(&self, id: &str) -> Result<(), String> {
        self.update_state(id, DownloadState::Cancelled)
    }

    pub fn pause(&self, id: &str) -> Result<(), String> {
        self.update_state(id, DownloadState::Interrupted)
    }

    pub fn resume(&self, id: &str) -> Result<(), String> {
        self.update_state(id, DownloadState::Pending)
    }

    pub fn remove(&self, id: &str) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        data.downloads.remove(id);
        drop(data);
        self.save()
    }

    pub fn clear_completed(&self) -> Result<usize, String> {
        let mut data = self.data.lock().unwrap();
        let count = data.downloads.values()
            .filter(|d| d.state == DownloadState::Completed)
            .count();
        data.downloads.retain(|_, d| d.state != DownloadState::Completed);
        drop(data);
        self.save()?;
        Ok(count)
    }

    pub fn clear_all(&self) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        data.downloads.clear();
        drop(data);
        self.save()
    }

    pub fn open_file(&self, id: &str) -> Result<(), String> {
        let download = self.get(id)
            .ok_or("Download not found")?;
        
        let path = download.path
            .ok_or("File path not available")?;
        
        let path = PathBuf::from(path);
        if !path.exists() {
            return Err("File not found".to_string());
        }
        
        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("explorer")
                .args(["/select,", &path.to_string_lossy()])
                .spawn()
                .map_err(|e| format!("Failed to open file: {}", e))?;
        }
        
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .args(["-R", &path.to_string_lossy()])
                .spawn()
                .map_err(|e| format!("Failed to open file: {}", e))?;
        }
        
        #[cfg(target_os = "linux")]
        {
            use std::process::Command;
            let parent = path.parent().unwrap_or(&path);
            Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| format!("Failed to open file: {}", e))?;
        }
        
        Ok(())
    }

    pub fn get_stats(&self) -> DownloadStats {
        let data = self.data.lock().unwrap();
        let total = data.downloads.len();
        let completed = data.downloads.values().filter(|d| d.state == DownloadState::Completed).count();
        let failed = data.downloads.values().filter(|d| d.state == DownloadState::Failed).count();
        let total_bytes: u64 = data.downloads.values().map(|d| d.received_bytes).sum();
        
        DownloadStats {
            total_downloads: total,
            completed_downloads: completed,
            failed_downloads: failed,
            total_bytes_downloaded: total_bytes,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadStats {
    pub total_downloads: usize,
    pub completed_downloads: usize,
    pub failed_downloads: usize,
    pub total_bytes_downloaded: u64,
}

impl Default for DownloadData {
    fn default() -> Self {
        Self {
            downloads: HashMap::new(),
        }
    }
}