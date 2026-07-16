use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tracing::{info, warn, error};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub url: String,
    pub title: String,
    pub visit_count: u32,
    pub last_visited: String,
    pub first_visited: String,
    pub favicon: Option<String>,
    pub typed_count: u32,
    pub transition: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct HistoryData {
    entries: HashMap<String, HistoryEntry>,
    visits: Vec<Visit>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Visit {
    pub entry_id: String,
    pub timestamp: String,
    pub transition: String,
}

pub struct HistoryManager {
    data: HistoryData,
    file_path: PathBuf,
    max_entries: usize,
}

impl HistoryManager {
    pub fn new() -> Self {
        let file_path = Self::get_history_path();
        let data = if file_path.exists() {
            Self::load_from_file(&file_path).unwrap_or_default()
        } else {
            HistoryData::default()
        };
        
        Self { 
            data, 
            file_path,
            max_entries: 100000,
        }
    }

    fn get_history_path() -> PathBuf {
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("privacy-browser")
            .join("history.json")
    }

    fn load_from_file(path: &PathBuf) -> Result<HistoryData, String> {
        let content = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read history file: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse history: {}", e))
    }

    fn save_to_file(&self) -> Result<(), String> {
        if let Some(parent) = self.file_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }
        
        let content = serde_json::to_string(&self.data)
            .map_err(|e| format!("Failed to serialize history: {}", e))?;
        
        fs::write(&self.file_path, content)
            .map_err(|e| format!("Failed to write history file: {}", e))
    }

    pub fn load(&mut self) -> Result<(), String> {
        if self.file_path.exists() {
            self.data = Self::load_from_file(&self.file_path)?;
        }
        Ok(())
    }

    pub fn get_all(&self) -> Vec<HistoryEntry> {
        let mut entries: Vec<_> = self.data.entries.values().cloned().collect();
        entries.sort_by(|a, b| b.last_visited.cmp(&a.last_visited));
        entries
    }

    pub fn get_recent(&self, limit: usize) -> Vec<HistoryEntry> {
        let mut entries = self.get_all();
        entries.truncate(limit);
        entries
    }

    pub fn get_by_url(&self, url: &str) -> Option<&HistoryEntry> {
        self.data.entries.values().find(|e| e.url == url)
    }

    pub fn get_by_id(&self, id: &str) -> Option<&HistoryEntry> {
        self.data.entries.get(id)
    }

    pub fn add_visit(&mut self, url: String, title: String, transition: String) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();
        
        if let Some(entry) = self.data.entries.get_mut(&url) {
            entry.visit_count += 1;
            entry.last_visited = now.clone();
            entry.title = title;
            if entry.favicon.is_none() {
                entry.favicon = Some(format!("https://www.google.com/s2/favicons?sz=32&domain={}", 
                    url.split("://").nth(1).unwrap_or("").split('/').next().unwrap_or("")));
            }
        } else {
            let entry = HistoryEntry {
                id: Uuid::new_v4().to_string(),
                url: url.clone(),
                title,
                visit_count: 1,
                last_visited: now.clone(),
                first_visited: now.clone(),
                favicon: Some(format!("https://www.google.com/s2/favicons?sz=32&domain={}", 
                    url.split("://").nth(1).unwrap_or("").split('/').next().unwrap_or(""))),
                typed_count: if transition == "typed" { 1 } else { 0 },
                transition: transition.clone(),
            };
            self.data.entries.insert(url.clone(), entry);
        }

        self.data.visits.push(Visit {
            entry_id: url,
            timestamp: now,
            transition,
        });

        if self.data.entries.len() > self.max_entries {
            self.prune_old_entries();
        }

        self.save_to_file()
    }

    fn prune_old_entries(&mut self) {
        let mut entries: Vec<_> = self.data.entries.values().cloned().collect();
        entries.sort_by(|a, b| a.last_visited.cmp(&b.last_visited));
        
        let to_remove = entries.len().saturating_sub(self.max_entries);
        for entry in entries.iter().take(to_remove) {
            self.data.entries.remove(&entry.url);
        }
    }

    pub fn update_title(&mut self, url: &str, title: String) -> Result<(), String> {
        if let Some(entry) = self.data.entries.get_mut(url) {
            entry.title = title;
            self.save_to_file()
        } else {
            Err("Entry not found".to_string())
        }
    }

    pub fn update_favicon(&mut self, url: &str, favicon: String) -> Result<(), String> {
        if let Some(entry) = self.data.entries.get_mut(url) {
            entry.favicon = Some(favicon);
            self.save_to_file()
        } else {
            Err("Entry not found".to_string())
        }
    }

    pub fn remove(&mut self, id: &str) -> Result<(), String> {
        if let Some(entry) = self.data.entries.remove(id) {
            self.data.visits.retain(|v| v.entry_id != entry.url);
            self.save_to_file()
        } else {
            Err("Entry not found".to_string())
        }
    }

    pub fn clear(&mut self) -> Result<(), String> {
        self.data.entries.clear();
        self.data.visits.clear();
        self.save_to_file()
    }

    pub fn clear_before(&mut self, timestamp: &str) -> Result<usize, String> {
        let mut removed = 0;
        self.data.entries.retain(|_, entry| {
            if entry.last_visited < timestamp {
                removed += 1;
                false
            } else {
                true
            }
        });
        self.data.visits.retain(|v| v.timestamp >= timestamp);
        self.save_to_file()?;
        Ok(removed)
    }

    pub fn search(&self, query: &str, limit: usize) -> Vec<HistoryEntry> {
        let query = query.to_lowercase();
        let mut results: Vec<_> = self.data.entries
            .values()
            .filter(|e| {
                e.title.to_lowercase().contains(&query) ||
                e.url.to_lowercase().contains(&query)
            })
            .cloned()
            .collect();
        
        results.sort_by(|a, b| b.last_visited.cmp(&a.last_visited));
        results.truncate(limit);
        results
    }

    pub fn get_typed_urls(&self, limit: usize) -> Vec<HistoryEntry> {
        let mut entries: Vec<_> = self.data.entries
            .values()
            .filter(|e| e.typed_count > 0)
            .cloned()
            .collect();
        
        entries.sort_by(|a, b| b.typed_count.cmp(&a.typed_count).then(b.last_visited.cmp(&a.last_visited)));
        entries.truncate(limit);
        entries
    }

    pub fn get_most_visited(&self, limit: usize) -> Vec<HistoryEntry> {
        let mut entries: Vec<_> = self.data.entries.values().cloned().collect();
        entries.sort_by(|a, b| b.visit_count.cmp(&a.visit_count).then(b.last_visited.cmp(&a.last_visited)));
        entries.truncate(limit);
        entries
    }

    pub fn get_stats(&self) -> HistoryStats {
        let total_visits: u32 = self.data.entries.values().map(|e| e.visit_count).sum();
        let total_entries = self.data.entries.len();
        
        let today = chrono::Utc::now().date_naive();
        let today_count = self.data.visits.iter()
            .filter(|v| v.timestamp.starts_with(&today.to_string()))
            .count();
        
        let this_week_count = self.data.visits.iter()
            .filter(|v| {
                if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&v.timestamp) {
                    (chrono::Utc::now() - dt.with_timezone(&chrono::Utc)).num_days() < 7
                } else {
                    false
                }
            })
            .count();

        HistoryStats {
            total_entries,
            total_visits,
            today_visits: today_count,
            this_week_visits: this_week_count,
            oldest_entry: self.data.entries.values()
                .min_by_key(|e| e.first_visited.clone())
                .map(|e| e.first_visited.clone()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryStats {
    pub total_entries: usize,
    pub total_visits: u32,
    pub today_visits: usize,
    pub this_week_visits: usize,
    pub oldest_entry: Option<String>,
}

impl Default for HistoryData {
    fn default() -> Self {
        Self {
            entries: HashMap::new(),
            visits: Vec::new(),
        }
    }
}