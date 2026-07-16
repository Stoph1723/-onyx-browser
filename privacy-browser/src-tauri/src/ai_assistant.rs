use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use serde::{Serialize, Deserialize};
use tracing::{info, warn, error};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIMessage {
    pub role: String,
    pub content: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConversation {
    pub id: String,
    pub title: String,
    pub messages: Vec<AIMessage>,
    pub model: String,
    pub createdAt: String,
    pub updatedAt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaModel {
    pub name: String,
    pub size: u64,
    pub modifiedAt: String,
    pub digest: String,
}

pub struct AIAssistant {
    baseUrl: String,
    availableModels: Vec<OllamaModel>,
    currentModel: String,
    conversations: HashMap<String, AIConversation>,
    activeConversationId: Option<String>,
    isGenerating: bool,
}

impl AIAssistant {
    pub fn new() -> Self {
        Self {
            baseUrl: "http://localhost:11434".to_string(),
            availableModels: Vec::new(),
            currentModel: "llama3.2".to_string(),
            conversations: HashMap::new(),
            activeConversationId: None,
            isGenerating: false,
        }
    }

    pub fn set_base_url(&mut self, url: String) {
        self.baseUrl = url;
    }

    pub async fn check_connection(&self) -> Result<bool, String> {
        let client = reqwest::Client::new();
        match client.get(&format!("{}/api/tags", self.baseUrl)).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(e) => Err(format!("Failed to connect to Ollama: {}", e)),
        }
    }

    pub async fn list_models(&mut self) -> Result<Vec<OllamaModel>, String> {
        let client = reqwest::Client::new();
        let response = client
            .get(&format!("{}/api/tags", self.baseUrl))
            .send()
            .await
            .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

        let json: serde_json::Value = response.json().await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let models = json["models"].as_array()
            .ok_or("No models array in response")?
            .iter()
            .filter_map(|m| {
                Some(OllamaModel {
                    name: m["name"].as_str()?.to_string(),
                    size: m["size"].as_u64().unwrap_or(0),
                    modifiedAt: m["modified_at"].as_str().unwrap_or("").to_string(),
                    digest: m["digest"].as_str().unwrap_or("").to_string(),
                })
            })
            .collect();

        self.availableModels = models.clone();
        Ok(models)
    }

    pub async fn pull_model(&self, name: String) -> Result<(), String> {
        let client = reqwest::Client::new();
        let response = client
            .post(&format!("{}/api/pull", self.baseUrl))
            .json(&serde_json::json!({ "name": name }))
            .send()
            .await
            .map_err(|e| format!("Failed to start pull: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Failed to pull model: {}", response.status()));
        }

        Ok(())
    }

    pub async fn delete_model(&self, name: String) -> Result<(), String> {
        let client = reqwest::Client::new();
        let response = client
            .delete(&format!("{}/api/delete", self.baseUrl))
            .json(&serde_json::json!({ "name": name }))
            .send()
            .await
            .map_err(|e| format!("Failed to delete model: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Failed to delete model: {}", response.status()));
        }

        Ok(())
    }

    pub async fn generate(
        &self,
        prompt: String,
        model: Option<String>,
        options: Option<serde_json::Value>,
    ) -> Result<String, String> {
        let client = reqwest::Client::new();
        
        let mut body = serde_json::json!({
            "model": model.unwrap_or_else(|| self.currentModel.clone()),
            "prompt": prompt,
            "stream": false,
        });

        if let Some(opts) = options {
            body = serde_json::json!({
                "model": model.unwrap_or_else(|| self.currentModel.clone()),
                "prompt": prompt,
                "stream": false,
                "options": opts,
            });
        }

        let response = reqwest::Client::new()
            .post(&format!("{}/api/generate", self.baseUrl))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Failed to generate: {}", e))?;

        let json: serde_json::Value = response.json().await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        json["response"].as_str()
            .map(|s| s.to_string())
            .ok_or("No response generated".to_string())
    }

    pub async fn stream_generate(
        &self,
        prompt: String,
        model: Option<String>,
        options: Option<serde_json::Value>,
        on_chunk: Box<dyn Fn(String) + Send>,
    ) -> Result<(), String> {
        // Streaming implementation would use SSE or WebSocket
        // For now, just use regular generate
        let result = self.generate(prompt, model, options).await?;
        on_chunk(result);
        Ok(())
    }

    pub async fn chat(
        &self,
        messages: Vec<AIMessage>,
        model: Option<String>,
        options: Option<serde_json::Value>,
    ) -> Result<AIMessage, String> {
        let client = reqwest::Client::new();
        
        let body = serde_json::json!({
            "model": model.unwrap_or_else(|| self.currentModel.clone()),
            "messages": messages,
            "stream": false,
            "options": options.unwrap_or(serde_json::json!({})),
        });

        let response = reqwest::Client::new()
            .post(&format!("{}/api/chat", self.baseUrl))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Failed to chat: {}", e))?;

        let json: serde_json::Value = response.json().await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let message = json["message"].as_object()
            .ok_or("No message in response")?;
        
        Ok(AIMessage {
            role: message["role"].as_str().unwrap_or("assistant").to_string(),
            content: message["content"].as_str().unwrap_or("").to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        })
    }

    pub async fn stream_chat(
        &self,
        messages: Vec<AIMessage>,
        model: Option<String>,
        options: Option<serde_json::Value>,
        on_chunk: Box<dyn Fn(String) + Send>,
    ) -> Result<(), String> {
        // Streaming chat implementation would use SSE
        // For now, use regular chat
        let response = self.chat(messages, model, options).await?;
        on_chunk(response.content);
        Ok(())
    }

    pub fn set_model(&mut self, model: String) {
        self.currentModel = model;
    }

    pub fn get_available_models(&self) -> Vec<OllamaModel> {
        self.availableModels.clone()
    }

    pub fn create_conversation(&mut self, title: String, model: String) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        
        let conversation = AIConversation {
            id: id.clone(),
            title,
            messages: Vec::new(),
            model,
            createdAt: now.clone(),
            updatedAt: now,
        };
        
        self.conversations.insert(id.clone(), conversation);
        self.activeConversationId = Some(id);
        id
    }

    pub fn add_message(&mut self, conversation_id: String, role: String, content: String) {
        if let Some(conversation) = self.conversations.get_mut(&conversation_id) {
            conversation.messages.push(AIMessage {
                role,
                content,
                timestamp: chrono::Utc::now().to_rfc3339(),
            });
            conversation.updatedAt = chrono::Utc::now().to_rfc3339();
        }
    }

    pub fn get_conversations(&self) -> Vec<AIConversation> {
        self.conversations.values().cloned().collect()
    }

    pub fn get_conversation(&self, id: &str) -> Option<AIConversation> {
        self.conversations.get(id).cloned()
    }

    pub fn set_active_conversation(&mut self, id: Option<String>) {
        self.activeConversationId = id;
    }

    pub fn get_active_conversation(&self) -> Option<AIConversation> {
        self.activeConversationId.as_ref().and_then(|id| self.conversations.get(id).cloned())
    }

    pub fn delete_conversation(&mut self, id: String) {
        self.conversations.remove(&id);
        if self.activeConversationId.as_ref() == Some(&id) {
            self.activeConversationId = None;
        }
    }

    pub fn export_conversations(&self) -> Result<String, String> {
        serde_json::to_string_pretty(&self.conversations)
            .map_err(|e| format!("Failed to export conversations: {}", e))
    }

    pub fn import_conversations(&mut self, json: &str) -> Result<(), String> {
        let conversations: HashMap<String, AIConversation> = serde_json::from_str(json)
            .map_err(|e| format!("Failed to parse conversations: {}", e))?;
        self.conversations = conversations;
        Ok(())
    }

    pub fn get_current_model(&self) -> String {
        self.currentModel.clone()
    }

    pub fn set_current_model(&mut self, model: String) {
        self.currentModel = model;
    }

    pub fn is_generating(&self) -> bool {
        self.isGenerating
    }

    pub fn set_generating(&mut self, generating: boolean) {
        self.isGenerating = generating;
    }
}