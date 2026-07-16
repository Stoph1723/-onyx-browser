use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use adblock::{Adblocker, Engine, Blocklist, FilterSet};
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error, debug};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use url::Url;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdblockRule {
    pub id: String,
    pub rule: String,
    pub domain: Option<String>,
    pub enabled: bool,
    pub rule_type: RuleType,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RuleType {
    Block,
    Allow,
    Redirect,
    Cosmetic,
    Html,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlocklistStats {
    pub total_rules: usize,
    pub enabled_rules: usize,
    pub blocked_requests: u64,
    pub last_updated: Option<String>,
    pub filter_lists: Vec<FilterListInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterListInfo {
    pub name: String,
    pub url: String,
    pub enabled: bool,
    pub rules_count: usize,
    pub last_updated: Option<String>,
    pub error: Option<String>,
}

pub struct AdblockEngine {
    engine: Engine,
    rules: Vec<AdblockRule>,
    enabled: bool,
    filter_lists: Vec<FilterListInfo>,
    stats: BlocklistStats,
}

impl AdblockEngine {
    pub fn new() -> Self {
        let engine = Engine::new();
        Self {
            engine,
            rules: Vec::new(),
            enabled: true,
            filter_lists: Vec::new(),
            stats: BlocklistStats::default(),
        }
    }

    pub fn get_rules(&self) -> Vec<String> {
        self.rules.iter().map(|r| r.rule.clone()).collect()
    }

    pub fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    pub fn update_rules(&mut self, rules: Vec<AdblockRule>) -> Result<(), String> {
        self.rules = rules;
        self.rebuild_engine()?;
        Ok(())
    }

    fn rebuild_engine(&mut self) -> Result<(), String> {
        let mut filter_set = FilterSet::new();
        for rule in &self.rules {
            if rule.enabled {
                filter_set.add_filter(&rule.rule).map_err(|e| e.to_string())?;
            }
        }
        self.engine = Engine::from_filter_set(filter_set);
        self.update_stats();
        Ok(())
    }

    fn update_stats(&mut self) {
        let mut total = 0;
        let mut enabled = 0;
        let mut ads = 0;
        let mut trackers = 0;
        let mut malware = 0;
        let mut fingerprinting = 0;

        for rule in &self.rules {
            if rule.enabled {
                total += 1;
                enabled += 1;
                let rule_lower = rule.rule.to_lowercase();
                if rule_lower.contains("ad") || rule_lower.contains("banner") || rule_lower.contains("adsense") {
                    ads += 1;
                }
                if rule_lower.contains("track") || rule_lower.contains("analytics") || rule_lower.contains("pixel") {
                    trackers += 1;
                }
                if rule_lower.contains("malware") || rule_lower.contains("phish") {
                    malware += 1;
                }
                if rule_lower.contains("fingerprint") || rule_lower.contains("canvas") || rule_lower.contains("webgl") {
                    fingerprinting += 1;
                }
            }
        }

        self.stats = BlocklistStats {
            total_rules: total,
            enabled_rules: enabled,
            blocked_requests: 0,
            last_updated: Some(chrono::Utc::now().to_rfc3339()),
            filter_lists: self.filter_lists.clone(),
        };
    }

    pub fn get_stats(&self) -> BlocklistStats {
        self.stats.clone()
    }

    pub async fn update_filter_lists(&mut self) -> Result<(), String> {
        let default_lists = vec![
            FilterListInfo {
                name: "EasyList".to_string(),
                url: "https://easylist.to/easylist/easylist.txt".to_string(),
                enabled: true,
                rules_count: 0,
                last_updated: None,
                error: None,
            },
            FilterListInfo {
                name: "EasyPrivacy".to_string(),
                url: "https://easylist.to/easylist/easyprivacy.txt".to_string(),
                enabled: true,
                rules_count: 0,
                last_updated: None,
                error: None,
            },
            FilterListInfo {
                name: "EasyList Cookie".to_string(),
                url: "https://easylist.to/easylist/easylist-cookie.txt".to_string(),
                enabled: true,
                rules_count: 0,
                last_updated: None,
                error: None,
            },
            FilterListInfo {
                name: "Peter Lowe's List".to_string(),
                url: "https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&mimetype=plaintext".to_string(),
                enabled: true,
                rules_count: 0,
                last_updated: None,
                error: None,
            },
            FilterListInfo {
                name: "AdGuard Base".to_string(),
                url: "https://filters.adtidy.org/extension/chromium/filters/2.txt".to_string(),
                enabled: false,
                rules_count: 0,
                last_updated: None,
                error: None,
            },
            FilterListInfo {
                name: "AdGuard Tracking".to_string(),
                url: "https://filters.adtidy.org/extension/chromium/filters/4.txt".to_string(),
                enabled: false,
                rules_count: 0,
                last_updated: None,
                error: None,
            },
            FilterListInfo {
                name: "AdGuard Annoyances".to_string(),
                url: "https://filters.adtidy.org/extension/chromium/filters/14.txt".to_string(),
                enabled: false,
                rules_count: 0,
                last_updated: None,
                error: None,
            },
            FilterListInfo {
                name: "AdGuard URL Tracking".to_string(),
                url: "https://filters.adtidy.org/extension/chromium/filters/15.txt".to_string(),
                enabled: false,
                rules_count: 0,
                last_updated: None,
                error: None,
            },
            FilterListInfo {
                name: "OISD Full".to_string(),
                url: "https://raw.githubusercontent.com/oisd/adblock/main/filters.txt".to_string(),
                enabled: false,
                rules_count: 0,
                last_updated: None,
                error: None,
            },
        ];

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| e.to_string())?;

        let mut new_filter_lists = Vec::new();

        for list in default_lists {
            if !list.enabled {
                new_filter_lists.push(list);
                continue;
            }

            match Self::fetch_filter_list(&client, &list.url).await {
                Ok(rules) => {
                    let mut new_list = list.clone();
                    new_list.rules_count = rules.len();
                    new_list.last_updated = Some(chrono::Utc::now().to_rfc3339());
                    new_list.error = None;
                    new_filter_lists.push(new_list);

                    let mut filter_set = FilterSet::new();
                    for rule in rules {
                        if filter_set.add_filter(&rule).is_ok() {}
                    }
                }
                Err(e) => {
                    let mut new_list = list.clone();
                    new_list.error = Some(e.to_string());
                    new_filter_lists.push(new_list);
                    error!("Failed to update filter list {}: {}", list.name, e);
                }
            }
        }

        self.filter_lists = new_filter_lists;
        self.rebuild_engine()?;
        Ok(())
    }

    async fn fetch_filter_list(client: &reqwest::Client, url: &str) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let response = client.get(url).send().await?;
        let text = response.text().await?;
        let rules = text
            .lines()
            .filter(|line| !line.trim().is_empty() && !line.starts_with('!') && !line.starts_with('['))
            .map(|s| s.to_string())
            .collect();
        Ok(rules)
    }

    fn rebuild_engine(&mut self) -> Result<(), String> {
        let mut filter_set = FilterSet::new();
        for rule in &self.rules {
            if rule.enabled {
                filter_set.add_filter(&rule.rule).map_err(|e| e.to_string())?;
            }
        }
        self.engine = Engine::from_filter_set(filter_set);
        self.update_stats();
        Ok(())
    }

    pub fn check_url(&self, url: &str, source_url: &str, request_type: adblock::ResourceType) -> bool {
        if !self.enabled {
            return false;
        }
        match self.engine.check_network_request(url, source_url, request_type) {
            adblock::Action::Block => true,
            _ => false,
        }
    }

    pub fn check_cosmetic(&self, url: &str, selector: &str) -> bool {
        if !self.enabled {
            return false;
        }
        match self.engine.check_cosmetic_filter(url, selector) {
            adblock::Action::Block => true,
            _ => false,
        }
    }

    pub fn increment_blocked(&mut self) {
        self.stats.blocked_requests += 1;
    }

    pub fn initialize(&mut self) -> Result<(), String> {
        self.update_filter_lists().await?;
        Ok(())
    }
}

impl Default for AdblockEngine {
    fn default() -> Self {
        Self::new()
    }
}