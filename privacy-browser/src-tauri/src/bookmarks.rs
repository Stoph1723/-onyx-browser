use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tracing::{info, warn, error};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bookmark {
    pub id: String,
    pub title: String,
    pub url: String,
    pub folder: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub favicon: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookmarkFolder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub children: Vec<String>,
    pub created_at: String,
    pub order: usize,
}

#[derive(Debug, Serialize, Deserialize)]
struct BookmarkData {
    bookmarks: HashMap<String, Bookmark>,
    folders: HashMap<String, BookmarkFolder>,
    root_folder: String,
    other_folder: String,
    mobile_folder: String,
}

pub struct BookmarkManager {
    data: BookmarkData,
    file_path: PathBuf,
}

impl BookmarkManager {
    pub fn new() -> Self {
        let file_path = Self::get_bookmarks_path();
        let data = if file_path.exists() {
            Self::load_from_file(&file_path).unwrap_or_default()
        } else {
            BookmarkData::default()
        };
        
        Self { data, file_path }
    }

    fn get_bookmarks_path() -> PathBuf {
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("privacy-browser")
            .join("bookmarks.json")
    }

    fn load_from_file(path: &PathBuf) -> Result<BookmarkData, String> {
        let content = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read bookmarks file: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse bookmarks: {}", e))
    }

    fn save_to_file(&self) -> Result<(), String> {
        if let Some(parent) = self.file_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }
        
        let content = serde_json::to_string_pretty(&self.data)
            .map_err(|e| format!("Failed to serialize bookmarks: {}", e))?;
        
        fs::write(&self.file_path, content)
            .map_err(|e| format!("Failed to write bookmarks file: {}", e))
    }

    pub fn load(&mut self) -> Result<(), String> {
        if self.file_path.exists() {
            self.data = Self::load_from_file(&self.file_path)?;
        }
        Ok(())
    }

    pub fn get_all(&self) -> Vec<Bookmark> {
        self.data.bookmarks.values().cloned().collect()
    }

    pub fn get_by_folder(&self, folder_id: Option<&str>) -> Vec<Bookmark> {
        self.data.bookmarks
            .values()
            .filter(|b| b.folder.as_deref() == folder_id)
            .cloned()
            .collect()
    }

    pub fn get_root_bookmarks(&self) -> Vec<Bookmark> {
        self.get_by_folder(None)
    }

    pub fn get_folder(&self, folder_id: &str) -> Option<&BookmarkFolder> {
        self.data.folders.get(folder_id)
    }

    pub fn get_all_folders(&self) -> Vec<BookmarkFolder> {
        self.data.folders.values().cloned().collect()
    }

    pub fn get_folder_tree(&self) -> Vec<BookmarkFolder> {
        let mut roots = Vec::new();
        let mut folder_map = HashMap::new();
        
        for folder in self.data.folders.values() {
            folder_map.insert(folder.id.clone(), folder.clone());
        }
        
        for folder in self.data.folders.values() {
            if folder.parent_id.is_none() {
                roots.push(folder.clone());
            }
        }
        
        fn build_tree(
            folder: &BookmarkFolder,
            folder_map: &HashMap<String, BookmarkFolder>,
        ) -> BookmarkFolder {
            let mut children = Vec::new();
            for child_id in &folder.children {
                if let Some(child) = folder_map.get(child_id) {
                    children.push(build_tree(child, folder_map));
                }
            }
            
            BookmarkFolder {
                children,
                ..folder.clone()
            }
        }
        
        roots.iter().map(|r| build_tree(r, &folder_map)).collect()
    }

    pub fn add(&mut self, mut bookmark: Bookmark) -> Result<(), String> {
        if bookmark.id.is_empty() {
            bookmark.id = Uuid::new_v4().to_string();
        }
        bookmark.created_at = chrono::Utc::now().to_rfc3339();
        bookmark.updated_at = bookmark.created_at.clone();
        
        self.data.bookmarks.insert(bookmark.id.clone(), bookmark);
        self.save_to_file()
    }

    pub fn add_folder(&mut self, mut folder: BookmarkFolder) -> Result<(), String> {
        if folder.id.is_empty() {
            folder.id = Uuid::new_v4().to_string();
        }
        folder.created_at = chrono::Utc::now().to_rfc3339();
        
        if let Some(parent_id) = &folder.parent_id {
            if let Some(parent) = self.data.folders.get_mut(parent_id) {
                parent.children.push(folder.id.clone());
            }
        }
        
        self.data.folders.insert(folder.id.clone(), folder);
        self.save_to_file()
    }

    pub fn update(&mut self, mut bookmark: Bookmark) -> Result<(), String> {
        if let Some(existing) = self.data.bookmarks.get(&bookmark.id) {
            bookmark.created_at = existing.created_at.clone();
            bookmark.updated_at = chrono::Utc::now().to_rfc3339();
            self.data.bookmarks.insert(bookmark.id.clone(), bookmark);
            self.save_to_file()
        } else {
            Err("Bookmark not found".to_string())
        }
    }

    pub fn update_folder(&mut self, folder: BookmarkFolder) -> Result<(), String> {
        if self.data.folders.contains_key(&folder.id) {
            self.data.folders.insert(folder.id.clone(), folder);
            self.save_to_file()
        } else {
            Err("Folder not found".to_string())
        }
    }

    pub fn remove(&mut self, id: &str) -> Result<(), String> {
        if self.data.bookmarks.remove(id).is_some() {
            self.save_to_file()
        } else {
            Err("Bookmark not found".to_string())
        }
    }

    pub fn remove_folder(&mut self, id: &str) -> Result<(), String> {
        let folder = self.data.folders.remove(id)
            .ok_or("Folder not found")?;
        
        for child_id in &folder.children {
            self.remove_folder(child_id)?;
        }
        
        self.data.bookmarks.retain(|_, b| b.folder.as_deref() != Some(id));
        
        if let Some(parent_id) = folder.parent_id {
            if let Some(parent) = self.data.folders.get_mut(&parent_id) {
                parent.children.retain(|c| c != id);
            }
        }
        
        self.save_to_file()
    }

    pub fn move_bookmark(&mut self, bookmark_id: &str, new_folder: Option<String>) -> Result<(), String> {
        if let Some(bookmark) = self.data.bookmarks.get_mut(bookmark_id) {
            bookmark.folder = new_folder;
            bookmark.updated_at = chrono::Utc::now().to_rfc3339();
            self.save_to_file()
        } else {
            Err("Bookmark not found".to_string())
        }
    }

    pub fn import_bookmarks(&mut self, bookmarks: Vec<Bookmark>) -> Result<usize, String> {
        let mut count = 0;
        for mut bookmark in bookmarks {
            if bookmark.id.is_empty() {
                bookmark.id = Uuid::new_v4().to_string();
            }
            bookmark.created_at = chrono::Utc::now().to_rfc3339();
            bookmark.updated_at = bookmark.created_at.clone();
            
            self.data.bookmarks.insert(bookmark.id.clone(), bookmark);
            count += 1;
        }
        self.save_to_file()?;
        Ok(count)
    }

    pub fn export_bookmarks(&self) -> Vec<Bookmark> {
        self.data.bookmarks.values().cloned().collect()
    }

    pub fn search(&self, query: &str) -> Vec<Bookmark> {
        let query = query.to_lowercase();
        self.data.bookmarks
            .values()
            .filter(|b| {
                b.title.to_lowercase().contains(&query) ||
                b.url.to_lowercase().contains(&query) ||
                b.tags.iter().any(|t| t.to_lowercase().contains(&query))
            })
            .cloned()
            .collect()
    }
}

impl Default for BookmarkData {
    fn default() -> Self {
        let root_id = "root".to_string();
        let other_id = "other".to_string();
        let mobile_id = "mobile".to_string();
        
        let mut folders = HashMap::new();
        folders.insert(root_id.clone(), BookmarkFolder {
            id: root_id.clone(),
            name: "Bookmarks Bar".to_string(),
            parent_id: None,
            children: Vec::new(),
            created_at: chrono::Utc::now().to_rfc3339(),
            order: 0,
        });
        folders.insert(other_id.clone(), BookmarkFolder {
            id: other_id.clone(),
            name: "Other Bookmarks".to_string(),
            parent_id: None,
            children: Vec::new(),
            created_at: chrono::Utc::now().to_rfc3339(),
            order: 1,
        });
        folders.insert(mobile_id.clone(), BookmarkFolder {
            id: mobile_id.clone(),
            name: "Mobile Bookmarks".to_string(),
            parent_id: None,
            children: Vec::new(),
            created_at: chrono::Utc::now().to_rfc3339(),
            order: 2,
        });
        
        Self {
            bookmarks: HashMap::new(),
            folders,
            root_folder: root_id,
            other_folder: other_id,
            mobile_folder: mobile_id,
        }
    }
}