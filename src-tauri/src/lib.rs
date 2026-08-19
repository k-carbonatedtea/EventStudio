use revfl::evfl::EventFlow;
use roead::sarc::{Sarc, SarcWriter};
use std::fs;
use std::io::Cursor;
use std::hash::{Hash, Hasher};
use tauri::Manager;
use serde::Serialize;

// 生成稳定且唯一的文件归属标识（同一文件路径生成唯一固定的缓存键）
fn get_stable_file_key(file_path: &str) -> String {
    let clean_path = file_path.trim();
    if clean_path.is_empty() || clean_path == "Untitled" {
        return "Untitled".to_string();
    }
    
    let base_name = clean_path
        .split('/')
        .last()
        .unwrap_or(clean_path)
        .split('\\')
        .last()
        .unwrap_or(clean_path);

    let safe_base: String = base_name.chars().map(|c| match c {
        '/' | '\\' | '?' | '%' | '*' | ':' | '|' | '"' | '<' | '>' | ' ' => '_',
        _ => c,
    }).collect();

    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    clean_path.hash(&mut hasher);
    let hash_val = hasher.finish();
    let short_hash = format!("{:06x}", (hash_val & 0xFFFFFF) as u32);

    format!("{}_{}", safe_base, short_hash)
}

#[derive(Serialize, serde::Deserialize)]
struct SavedStepMeta {
    step_idx: usize,
    title: String,
    detail: String,
    time: String,
}

#[derive(Serialize, serde::Deserialize)]
struct SavedTimeline {
    file_path: String,
    current_index: usize,
    steps: Vec<SavedStepMeta>,
    updated_at: u64,
}

#[derive(Serialize)]
struct LoadedHistoryItem {
    title: String,
    detail: String,
    time: String,
    data: serde_json::Value,
}

#[derive(Serialize)]
struct LoadedHistoryResult {
    steps: Vec<LoadedHistoryItem>,
    current_index: usize,
}

#[tauri::command]
fn auto_save_step(
    app_handle: tauri::AppHandle,
    file_path: &str,
    step_idx: usize,
    title: &str,
    detail: &str,
    time: &str,
    json_data: &str,
) -> Result<(), String> {
    // 基于文件的稳定唯一 Key 进行自动备份与历史步骤持久化
    let file_key = get_stable_file_key(file_path);
    let docs_dir = app_handle.path().document_dir().map_err(|e| e.to_string())?;
    let autosave_dir = docs_dir.join("EventEditor").join("autosave").join(&file_key);
    std::fs::create_dir_all(&autosave_dir).map_err(|e| e.to_string())?;

    // 保存最新状态与当前步骤快照
    let latest_file = autosave_dir.join("latest.json");
    std::fs::write(&latest_file, json_data).map_err(|e| e.to_string())?;

    let step_file = autosave_dir.join(format!("step_{}.json", step_idx));
    std::fs::write(&step_file, json_data).map_err(|e| e.to_string())?;

    // 维护 timeline.json 时间轴元数据
    let timeline_path = autosave_dir.join("timeline.json");
    let mut timeline: SavedTimeline = if let Ok(content) = std::fs::read_to_string(&timeline_path) {
        serde_json::from_str(&content).unwrap_or(SavedTimeline {
            file_path: file_path.to_string(),
            current_index: 0,
            steps: Vec::new(),
            updated_at: 0,
        })
    } else {
        SavedTimeline {
            file_path: file_path.to_string(),
            current_index: 0,
            steps: Vec::new(),
            updated_at: 0,
        }
    };

    // 截断到 step_idx 并追加当前步骤元数据
    if step_idx < timeline.steps.len() {
        timeline.steps.truncate(step_idx);
    }
    timeline.steps.push(SavedStepMeta {
        step_idx,
        title: title.to_string(),
        detail: detail.to_string(),
        time: time.to_string(),
    });
    timeline.current_index = step_idx;
    timeline.file_path = file_path.to_string();
    timeline.updated_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let _ = std::fs::write(
        timeline_path,
        serde_json::to_string_pretty(&timeline).unwrap_or_default(),
    );

    Ok(())
}

#[tauri::command]
fn load_file_history(app_handle: tauri::AppHandle, file_path: &str) -> Result<Option<LoadedHistoryResult>, String> {
    // 读取指定文件之前保存的所有历史步骤与时间轴数据
    let file_key = get_stable_file_key(file_path);
    let docs_dir = app_handle.path().document_dir().map_err(|e| e.to_string())?;
    let autosave_dir = docs_dir.join("EventEditor").join("autosave").join(&file_key);
    let timeline_path = autosave_dir.join("timeline.json");

    if !timeline_path.exists() {
        return Ok(None);
    }

    let content = std::fs::read_to_string(&timeline_path).map_err(|e| e.to_string())?;
    let timeline: SavedTimeline = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let mut loaded_steps = Vec::new();
    for step in &timeline.steps {
        let step_file = autosave_dir.join(format!("step_{}.json", step.step_idx));
        if step_file.exists() {
            if let Ok(data_str) = std::fs::read_to_string(&step_file) {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&data_str) {
                    loaded_steps.push(LoadedHistoryItem {
                        title: step.title.clone(),
                        detail: step.detail.clone(),
                        time: step.time.clone(),
                        data: parsed,
                    });
                }
            }
        }
    }

    if loaded_steps.is_empty() {
        return Ok(None);
    }

    let valid_index = if timeline.current_index < loaded_steps.len() {
        timeline.current_index
    } else {
        loaded_steps.len().saturating_sub(1)
    };

    Ok(Some(LoadedHistoryResult {
        steps: loaded_steps,
        current_index: valid_index,
    }))
}

#[derive(serde::Deserialize)]
struct SyncHistoryItemInput {
    title: String,
    detail: String,
    time: String,
    data: serde_json::Value,
}

#[tauri::command]
fn sync_file_history_timeline(
    app_handle: tauri::AppHandle,
    file_path: &str,
    current_index: usize,
    steps: Vec<SyncHistoryItemInput>,
) -> Result<(), String> {
    // 同步/覆盖指定文件的完整时间轴历史步骤（用于删除步骤或清空步骤后持久化同步）
    let file_key = get_stable_file_key(file_path);
    let docs_dir = app_handle.path().document_dir().map_err(|e| e.to_string())?;
    let autosave_dir = docs_dir.join("EventEditor").join("autosave").join(&file_key);
    std::fs::create_dir_all(&autosave_dir).map_err(|e| e.to_string())?;

    // 清理原有的 step_*.json 历史快照
    if let Ok(entries) = std::fs::read_dir(&autosave_dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if name.starts_with("step_") && name.ends_with(".json") {
                    let _ = std::fs::remove_file(entry.path());
                }
            }
        }
    }

    let mut saved_metas = Vec::new();
    for (idx, step) in steps.iter().enumerate() {
        let step_file = autosave_dir.join(format!("step_{}.json", idx));
        let data_str = serde_json::to_string(&step.data).unwrap_or_default();
        let _ = std::fs::write(&step_file, &data_str);
        if idx == current_index || (current_index >= steps.len() && idx == steps.len() - 1) {
            let latest_file = autosave_dir.join("latest.json");
            let _ = std::fs::write(latest_file, &data_str);
        }
        saved_metas.push(SavedStepMeta {
            step_idx: idx,
            title: step.title.clone(),
            detail: step.detail.clone(),
            time: step.time.clone(),
        });
    }

    let valid_idx = if current_index < steps.len() { current_index } else { steps.len().saturating_sub(1) };
    let timeline = SavedTimeline {
        file_path: file_path.to_string(),
        current_index: valid_idx,
        steps: saved_metas,
        updated_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };

    let timeline_path = autosave_dir.join("timeline.json");
    let _ = std::fs::write(
        timeline_path,
        serde_json::to_string_pretty(&timeline).unwrap_or_default(),
    );

    Ok(())
}

#[tauri::command]
fn clean_autosave_cache(app_handle: tauri::AppHandle) -> Result<usize, String> {
    // 一键清理自动保存缓存与过期的旧 project 目录
    let docs_dir = app_handle.path().document_dir().map_err(|e| e.to_string())?;
    let base_dir = docs_dir.join("EventEditor");

    // 移除旧版遗留的 project 目录
    let old_project_dir = base_dir.join("project");
    if old_project_dir.exists() {
        let _ = std::fs::remove_dir_all(&old_project_dir);
    }

    // 清理 autosave 目录
    let autosave_dir = base_dir.join("autosave");
    let mut removed_count = 0;
    if autosave_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&autosave_dir) {
            for entry in entries.flatten() {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_dir() {
                        let _ = std::fs::remove_dir_all(entry.path());
                        removed_count += 1;
                    }
                }
            }
        }
    }
    Ok(removed_count)
}

#[tauri::command]
fn load_sbeventpack(path: &str) -> Result<Vec<FileNode>, String> {
    let data = fs::read(path).map_err(|e| e.to_string())?;
    Ok(get_sarc_nodes(&data, &format!("SARC:{}", path)))
}

#[tauri::command]
fn load_evfl_from_pack(pack_path: &str, file_name: &str) -> Result<String, String> {
    let data = fs::read(pack_path).map_err(|e| e.to_string())?;
    let decompressed = roead::yaz0::decompress(&data).unwrap_or(data);
    let sarc = Sarc::new(&decompressed).map_err(|e| e.to_string())?;
    
    let file_data = sarc.files()
        .find(|f| f.name() == Some(file_name))
        .map(|f| f.data().to_vec())
        .ok_or_else(|| format!("未在压缩包中找到文件 {}", file_name))?;
        
    if file_name.to_lowercase().ends_with(".json") {
        return String::from_utf8(file_data).map_err(|e| e.to_string());
    }

    if file_data.len() < 8 || !file_data.starts_with(b"BFEVFL") {
        return Err(format!("文件 {} 不是有效的 BFEVFL 格式", file_name));
    }

    let mut evfl = EventFlow::new();
    let res = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        evfl.read(&file_data);
    }));
    if res.is_err() {
        return Err(format!("解析事件流文件 {} 时发生错误（数据可能已损坏）", file_name));
    }
    serde_json::to_string(&evfl).map_err(|e| e.to_string())
}

// 辅助函数：确保 EventFlow 和 Flowchart 内部名称不为空且保持同步
fn ensure_evfl_names(evfl: &mut EventFlow, fallback_path: &str) {
    let base = fallback_path.split('/').last().unwrap_or(fallback_path).split('\\').last().unwrap_or(fallback_path);
    let clean = if let Some((name, _)) = base.split_once('.') { name } else { base };

    if let Some(fc) = &mut evfl.flowchart {
        if !fc.name.trim().is_empty() {
            evfl.name = fc.name.trim().to_string();
        } else if !evfl.name.trim().is_empty() {
            fc.name = evfl.name.trim().to_string();
        } else {
            fc.name = clean.to_string();
            evfl.name = clean.to_string();
        }
    } else {
        if evfl.name.trim().is_empty() {
            evfl.name = clean.to_string();
        }
    }
}

#[tauri::command]
fn save_evfl_to_pack(pack_path: &str, file_name: &str, json_data: &str) -> Result<(), String> {
    // 读取原始 SARC 包数据
    let data = fs::read(pack_path).map_err(|e| e.to_string())?;
    let is_yaz0_orig = data.starts_with(b"Yaz0");
    let decompressed = roead::yaz0::decompress(&data).unwrap_or(data);
    let sarc = Sarc::new(&decompressed).map_err(|e| e.to_string())?;
    let mut writer = SarcWriter::from_sarc(&sarc);

    // 序列化修改后的 EventFlow 节点数据
    let out_data = if file_name.to_lowercase().ends_with(".json") {
        json_data.as_bytes().to_vec()
    } else {
        let mut evfl: EventFlow = serde_json::from_str(json_data).map_err(|e| e.to_string())?;
        ensure_evfl_names(&mut evfl, file_name);
        let write_res = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let mut out_cursor = Cursor::new(Vec::new());
            evfl.write(&mut out_cursor);
            out_cursor.into_inner()
        }));
        write_res.map_err(|_| "序列化 EventFlow 发生错误".to_string())?
    };

    // 更新压缩包中的目标文件
    writer.files.insert(file_name.to_string(), out_data);
    let sarc_data = writer.to_binary();

    // 如果原文件使用 Yaz0 压缩或文件名为 sbeventpack，则重新进行 Yaz0 压缩
    let final_data = if is_yaz0_orig || pack_path.to_lowercase().ends_with(".sbeventpack") {
        roead::yaz0::compress(&sarc_data)
    } else {
        sarc_data
    };

    fs::write(pack_path, final_data).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_editor_settings(app_handle: tauri::AppHandle) -> Result<String, String> {
    // 读取持久化编辑器全局设置
    let docs_dir = app_handle.path().document_dir().map_err(|e| e.to_string())?;
    let settings_path = docs_dir.join("EventEditor").join("settings.json");
    if !settings_path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(settings_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_editor_settings(app_handle: tauri::AppHandle, settings_json: &str) -> Result<(), String> {
    // 保存持久化编辑器全局设置（自动格式化为美化多行 JSON）
    let docs_dir = app_handle.path().document_dir().map_err(|e| e.to_string())?;
    let settings_dir = docs_dir.join("EventEditor");
    std::fs::create_dir_all(&settings_dir).map_err(|e| e.to_string())?;
    let settings_path = settings_dir.join("settings.json");

    let formatted = if let Ok(val) = serde_json::from_str::<serde_json::Value>(settings_json) {
        serde_json::to_string_pretty(&val).unwrap_or_else(|_| settings_json.to_string())
    } else {
        settings_json.to_string()
    };

    fs::write(settings_path, formatted).map_err(|e| e.to_string())
}

// BCML 路径导入结果
#[derive(serde::Serialize)]
struct BcmlImportResult {
    success: bool,
    message: String,
    wiiu_game_dir: Option<String>,
    wiiu_update_dir: Option<String>,
    wiiu_dlc_dir: Option<String>,
    switch_game_dir: Option<String>,
    switch_dlc_dir: Option<String>,
}

// 核心命令：一键导入系统 BCML 路径配置
#[tauri::command]
fn import_bcml_paths() -> Result<BcmlImportResult, String> {
    let local_appdata = std::env::var("LOCALAPPDATA").map_err(|_| "未找到系统 LOCALAPPDATA 环境变量".to_string())?;
    let bcml_path = std::path::PathBuf::from(local_appdata).join("bcml").join("settings.json");
    if !bcml_path.exists() {
        return Ok(BcmlImportResult {
            success: false,
            message: "未检测到 BCML 配置文件 (%LOCALAPPDATA%/bcml/settings.json)".to_string(),
            wiiu_game_dir: None,
            wiiu_update_dir: None,
            wiiu_dlc_dir: None,
            switch_game_dir: None,
            switch_dlc_dir: None,
        });
    }

    let content = std::fs::read_to_string(&bcml_path).map_err(|e| format!("读取 BCML 设置失败: {}", e))?;
    let val: serde_json::Value = serde_json::from_str(&content).map_err(|e| format!("解析 BCML JSON 失败: {}", e))?;

    let get_str = |key: &str| -> Option<String> {
        val.get(key).and_then(|v| v.as_str()).filter(|s| !s.trim().is_empty()).map(|s| s.to_string())
    };

    let wiiu_game_dir = get_str("game_dir");
    let wiiu_update_dir = get_str("update_dir");
    let wiiu_dlc_dir = get_str("dlc_dir");
    let switch_game_dir = get_str("game_dir_nx");
    let switch_dlc_dir = get_str("dlc_dir_nx");

    let has_any = wiiu_game_dir.is_some() || wiiu_update_dir.is_some() || switch_game_dir.is_some();

    Ok(BcmlImportResult {
        success: has_any,
        message: if has_any { "成功读取 BCML 路径配置".to_string() } else { "BCML 配置中未包含有效的游戏路径".to_string() },
        wiiu_game_dir,
        wiiu_update_dir,
        wiiu_dlc_dir,
        switch_game_dir,
        switch_dlc_dir,
    })
}

#[tauri::command]
fn open_settings_dir(app_handle: tauri::AppHandle) -> Result<(), String> {
    // 打开软件设置与自动备份目录
    let docs_dir = app_handle.path().document_dir().map_err(|e| e.to_string())?;
    let settings_dir = docs_dir.join("EventEditor");
    std::fs::create_dir_all(&settings_dir).map_err(|e| e.to_string())?;
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&settings_dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        tauri_plugin_opener::open_path(settings_dir.to_str().unwrap_or_default(), None::<&str>)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn open_path_in_explorer(path: &str) -> Result<(), String> {
    // 在系统资源管理器中打开指定项目或文件所在目录
    let p = std::path::Path::new(path);
    if !p.exists() {
        return Err("路径不存在".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        if p.is_file() {
            std::process::Command::new("explorer")
                .arg(format!("/select,{}", path))
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            std::process::Command::new("explorer")
                .arg(path)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        tauri_plugin_opener::open_path(path, None::<&str>)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn open_external_url(url: &str) -> Result<(), String> {
    // 在系统默认浏览器中打开外部链接
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/c", "start", "", url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = tauri_plugin_opener::open_url(url, None::<&str>);
    }
    Ok(())
}

#[tauri::command]
fn new_evfl() -> Result<String, String> {
    let mut evfl = EventFlow::new();
    evfl.name = "Untitled".to_string();
    let mut fc = revfl::flowchart::Flowchart::new();
    fc.name = "Untitled".to_string();
    evfl.flowchart = Some(fc);
    serde_json::to_string(&evfl).map_err(|e| e.to_string())
}

#[derive(Serialize)]
struct FileNode {
    name: String,
    path: String,
    is_dir: bool,
    is_sarc: bool,
    children: Option<Vec<FileNode>>,
}

fn get_sarc_nodes(data: &[u8], base_path: &str) -> Vec<FileNode> {
    use std::collections::HashMap;

    #[derive(Default)]
    struct TempNode {
        children: HashMap<String, TempNode>,
        file_info: Option<(String, bool, Option<Vec<FileNode>>)>, // (path, is_sarc, children)
    }

    let mut root = TempNode::default();
    let decompressed = roead::yaz0::decompress(data).unwrap_or_else(|_| data.to_vec());
    
    if let Ok(sarc) = Sarc::new(&decompressed) {
        for file in sarc.files() {
            if let Some(inner_name) = file.name() {
                let parts: Vec<&str> = inner_name.split('/').collect();
                let mut current = &mut root;
                
                for (i, part) in parts.iter().enumerate() {
                    let is_last = i == parts.len() - 1;
                    if is_last {
                        let name_lower = part.to_lowercase();
                        let is_sarc = name_lower.ends_with(".pack") || name_lower.ends_with(".sbeventpack") || name_lower.ends_with(".sarc") || name_lower.ends_with(".ssarc") || name_lower.ends_with(".sbactorpack") || name_lower.ends_with(".spack") || name_lower.ends_with(".bactorpack");
                        
                        let children = if is_sarc {
                            Some(get_sarc_nodes(file.data(), &format!("{}//{}", base_path, inner_name)))
                        } else {
                            None
                        };
                        
                        let entry = current.children.entry(part.to_string()).or_default();
                        entry.file_info = Some((format!("{}//{}", base_path, inner_name), is_sarc, children));
                    } else {
                        current = current.children.entry(part.to_string()).or_default();
                    }
                }
            }
        }
    }
    
    fn convert(temp: TempNode, current_virtual_dir: &str, base_path: &str) -> Vec<FileNode> {
        let mut nodes = Vec::new();
        for (name, child) in temp.children {
            if let Some((path, is_sarc, children)) = child.file_info {
                nodes.push(FileNode {
                    name,
                    path,
                    is_dir: false,
                    is_sarc,
                    children,
                });
            } else {
                let dir_virtual_path = if current_virtual_dir.is_empty() {
                    format!("{}//{}", base_path, name)
                } else {
                    format!("{}/{}", current_virtual_dir, name)
                };
                let mut dir_children = convert(child, &dir_virtual_path, base_path);
                dir_children.sort_by(|a, b| {
                    let a_is_folder = a.is_dir || a.is_sarc;
                    let b_is_folder = b.is_dir || b.is_sarc;
                    b_is_folder.cmp(&a_is_folder).then(a.name.cmp(&b.name))
                });
                nodes.push(FileNode {
                    name,
                    path: dir_virtual_path,
                    is_dir: true,
                    is_sarc: false,
                    children: Some(dir_children),
                });
            }
        }
        nodes.sort_by(|a, b| {
            let a_is_folder = a.is_dir || a.is_sarc;
            let b_is_folder = b.is_dir || b.is_sarc;
            b_is_folder.cmp(&a_is_folder).then(a.name.cmp(&b.name))
        });
        nodes
    }

    convert(root, "", base_path)
}

fn read_dir_recursive(dir_path: &std::path::Path) -> Result<Vec<FileNode>, String> {
    let mut nodes = Vec::new();
    if dir_path.is_dir() {
        let entries = std::fs::read_dir(dir_path).map_err(|e| e.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = path.is_dir();
            
            let name_lower = name.to_lowercase();
            let is_sarc = !is_dir && (name_lower.ends_with(".pack") || name_lower.ends_with(".sbeventpack") || name_lower.ends_with(".sarc") || name_lower.ends_with(".ssarc") || name_lower.ends_with(".sbactorpack") || name_lower.ends_with(".spack") || name_lower.ends_with(".bactorpack"));
            
            let (path_str, children) = if is_dir {
                (path.to_string_lossy().to_string(), Some(read_dir_recursive(&path)?))
            } else if is_sarc {
                let data = fs::read(&path).map_err(|e| e.to_string())?;
                let sarc_prefix = format!("SARC:{}", path.to_string_lossy());
                (sarc_prefix.clone(), Some(get_sarc_nodes(&data, &sarc_prefix)))
            } else {
                (path.to_string_lossy().to_string(), None)
            };
            
            nodes.push(FileNode {
                name,
                path: path_str,
                is_dir,
                is_sarc,
                children,
            });
        }
    }
    // Sort folders/sarcs first, then by name
    nodes.sort_by(|a, b| {
        let a_is_folder = a.is_dir || a.is_sarc;
        let b_is_folder = b.is_dir || b.is_sarc;
        b_is_folder.cmp(&a_is_folder).then(a.name.cmp(&b.name))
    });
    Ok(nodes)
}

fn read_file_from_path(path: &str) -> Result<Vec<u8>, String> {
    if path.starts_with("SARC:") {
        let parts: Vec<&str> = path.trim_start_matches("SARC:").split("//").collect();
        if parts.is_empty() {
            return Err("无效的 SARC 文件路径".to_string());
        }
        let mut data = fs::read(parts[0]).map_err(|e| e.to_string())?;
        
        for i in 1..parts.len() {
            let decompressed = roead::yaz0::decompress(&data).unwrap_or(data);
            let sarc = Sarc::new(&decompressed).map_err(|e| e.to_string())?;
            let inner_name = parts[i];
            let inner_norm = inner_name.replace('\\', "/");
            
            data = sarc.files()
                .find(|f| {
                    if let Some(name) = f.name() {
                        name == inner_name || name.replace('\\', "/") == inner_norm
                    } else {
                        false
                    }
                })
                .map(|f| f.data().to_vec())
                .ok_or_else(|| format!("未在压缩包中找到文件 {}", inner_name))?;
        }
        Ok(data)
    } else {
        fs::read(path).map_err(|e| e.to_string())
    }
}

fn repack_nested_sarc(pack_data: &[u8], pack_name: &str, inner_paths: &[&str], new_data: &[u8]) -> Result<Vec<u8>, String> {
    if inner_paths.is_empty() {
        return Ok(new_data.to_vec());
    }
    
    let is_yaz0 = pack_data.starts_with(b"Yaz0");
    let decompressed = roead::yaz0::decompress(pack_data).unwrap_or_else(|_| pack_data.to_vec());
    let sarc = Sarc::new(&decompressed).map_err(|e| e.to_string())?;
    
    let inner_name = inner_paths[0].replace('\\', "/");
    let mut writer = SarcWriter::from_sarc(&sarc);
    
    if inner_paths.len() == 1 {
        // 直接插入或更新当前 SARC 包内的目标文件
        writer.files.retain(|k, _| k.replace('\\', "/") != inner_name);
        writer.files.insert(inner_name, new_data.to_vec());
    } else {
        // 递归处理多层嵌套的子 SARC 压缩包
        let inner_norm = inner_name.as_str();
        let current_inner_data = sarc.files()
            .find(|f| {
                if let Some(name) = f.name() {
                    name == inner_norm || name.replace('\\', "/") == inner_norm
                } else {
                    false
                }
            })
            .map(|f| f.data().to_vec())
            .ok_or_else(|| format!("嵌套压缩包 {} 未在 SARC 中找到", inner_norm))?;
            
        let modified_inner_data = repack_nested_sarc(&current_inner_data, inner_norm, &inner_paths[1..], new_data)?;
        writer.files.retain(|k, _| k.replace('\\', "/") != inner_name);
        writer.files.insert(inner_name, modified_inner_data);
    }
    
    let new_sarc_data = writer.to_binary();
    let pack_name_lower = pack_name.to_lowercase();
    let force_compress = pack_name_lower.ends_with(".sbeventpack") || pack_name_lower.ends_with(".ssarc") || pack_name_lower.ends_with(".sbactorpack");
    
    let final_data = if is_yaz0 || force_compress {
        roead::yaz0::compress(&new_sarc_data)
    } else {
        new_sarc_data
    };
    
    Ok(final_data)
}

fn write_file_to_path(path: &str, new_data: &[u8]) -> Result<(), String> {
    if path.starts_with("SARC:") {
        let parts: Vec<&str> = path.trim_start_matches("SARC:").split("//").collect();
        if parts.is_empty() {
            return Err("无效的 SARC 文件路径".to_string());
        }
        let physical_data = fs::read(parts[0]).map_err(|e| e.to_string())?;
        let physical_name = parts[0].split('/').last().unwrap_or(parts[0]).split('\\').last().unwrap_or(parts[0]);
        let inner_paths = if parts.len() > 1 { &parts[1..] } else { &[] };
        let final_data = repack_nested_sarc(&physical_data, physical_name, inner_paths, new_data)?;
        fs::write(parts[0], final_data).map_err(|e| e.to_string())
    } else {
        fs::write(path, new_data).map_err(|e| e.to_string())
    }
}

// 从嵌套 SARC 压缩包中递归删除指定文件
fn delete_file_from_sarc(pack_data: &[u8], pack_name: &str, inner_paths: &[&str]) -> Result<Vec<u8>, String> {
    if inner_paths.is_empty() {
        return Err("无法删除根压缩包".to_string());
    }
    
    let is_yaz0 = pack_data.starts_with(b"Yaz0");
    let decompressed = roead::yaz0::decompress(pack_data).unwrap_or_else(|_| pack_data.to_vec());
    let sarc = Sarc::new(&decompressed).map_err(|e| e.to_string())?;
    
    let inner_name = inner_paths[0].replace('\\', "/");
    let mut writer = SarcWriter::from_sarc(&sarc);
    
    if inner_paths.len() == 1 {
        writer.files.retain(|k, _| k.replace('\\', "/") != inner_name);
    } else {
        let inner_norm = inner_name.as_str();
        let current_inner_data = sarc.files()
            .find(|f| {
                if let Some(name) = f.name() {
                    name == inner_norm || name.replace('\\', "/") == inner_norm
                } else {
                    false
                }
            })
            .map(|f| f.data().to_vec())
            .ok_or_else(|| format!("未在压缩包中找到文件 {}", inner_norm))?;
            
        let modified_inner_data = delete_file_from_sarc(&current_inner_data, inner_norm, &inner_paths[1..])?;
        writer.files.retain(|k, _| k.replace('\\', "/") != inner_name);
        writer.files.insert(inner_name, modified_inner_data);
    }
    
    let new_sarc_data = writer.to_binary();
    let pack_name_lower = pack_name.to_lowercase();
    let force_compress = pack_name_lower.ends_with(".sbeventpack") || pack_name_lower.ends_with(".ssarc") || pack_name_lower.ends_with(".sbactorpack");
    
    let final_data = if is_yaz0 || force_compress {
        roead::yaz0::compress(&new_sarc_data)
    } else {
        new_sarc_data
    };
    
    Ok(final_data)
}

// 在指定目录或 SARC 内嵌路径下创建全新的 .bfevfl 文件
#[tauri::command]
fn create_bfevfl_file(dir_or_pack_path: &str, file_name: &str) -> Result<String, String> {
    let clean_name = if file_name.to_lowercase().ends_with(".bfevfl") {
        file_name.to_string()
    } else {
        format!("{}.bfevfl", file_name)
    };
    
    let base_name = clean_name.trim_end_matches(".bfevfl");
    
    // 初始化包含基本 Flowchart 架构的 EventFlow
    let mut evfl = EventFlow::new();
    evfl.name = base_name.to_string();
    let mut fc = revfl::flowchart::Flowchart::new();
    fc.name = base_name.to_string();
    evfl.flowchart = Some(fc);
    
    let write_res = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let mut out_cursor = Cursor::new(Vec::new());
        evfl.write(&mut out_cursor);
        out_cursor.into_inner()
    }));
    let out_data = write_res.map_err(|_| "初始化 BFEVFL 数据失败".to_string())?;
    
    let is_sarc_path = dir_or_pack_path.starts_with("SARC:") || {
        let p_lower = dir_or_pack_path.to_lowercase();
        p_lower.ends_with(".sbeventpack") || p_lower.ends_with(".pack") || p_lower.ends_with(".sarc") || p_lower.ends_with(".ssarc") || p_lower.ends_with(".sbactorpack") || p_lower.ends_with(".spack")
    };
    
    if is_sarc_path {
        let full_virtual_path = if dir_or_pack_path.starts_with("SARC:") {
            let without_prefix = dir_or_pack_path.trim_start_matches("SARC:");
            if without_prefix.contains("//") {
                let parts: Vec<&str> = without_prefix.split("//").collect();
                if let Some(&last_part) = parts.last() {
                    let is_file = last_part.contains('.') && !last_part.ends_with(".sarc") && !last_part.ends_with(".pack");
                    let prefix = parts[..parts.len().saturating_sub(1)].join("//");
                    if is_file {
                        if let Some((parent_dir, _)) = last_part.rsplit_once('/') {
                            format!("SARC:{}//{}/{}", prefix, parent_dir, clean_name)
                        } else {
                            format!("SARC:{}//{}", prefix, clean_name)
                        }
                    } else if dir_or_pack_path.ends_with('/') || dir_or_pack_path.ends_with('\\') {
                        format!("{}{}", dir_or_pack_path, clean_name)
                    } else {
                        format!("{}/{}", dir_or_pack_path, clean_name)
                    }
                } else {
                    format!("SARC:{}//{}", without_prefix, clean_name)
                }
            } else {
                let pack_path = without_prefix;
                let pack_lower = pack_path.to_lowercase();
                if pack_lower.ends_with(".sbeventpack") {
                    format!("SARC:{}//EventFlow/{}", pack_path, clean_name)
                } else {
                    format!("SARC:{}//{}", pack_path, clean_name)
                }
            }
        } else {
            let pack_lower = dir_or_pack_path.to_lowercase();
            if pack_lower.ends_with(".sbeventpack") {
                format!("SARC:{}//EventFlow/{}", dir_or_pack_path, clean_name)
            } else {
                format!("SARC:{}//{}", dir_or_pack_path, clean_name)
            }
        };
        
        write_file_to_path(&full_virtual_path, &out_data)?;
        Ok(full_virtual_path)
    } else {
        let dir = std::path::Path::new(dir_or_pack_path);
        let target_path = if dir.is_dir() {
            dir.join(&clean_name)
        } else {
            dir.parent().unwrap_or(dir).join(&clean_name)
        };
        fs::write(&target_path, &out_data).map_err(|e| e.to_string())?;
        Ok(target_path.to_string_lossy().to_string())
    }
}

// 删除指定物理文件或从 SARC 压缩包中移除指定内嵌文件
#[tauri::command]
fn delete_file_by_path(path: &str) -> Result<(), String> {
    if path.starts_with("SARC:") {
        let parts: Vec<&str> = path.trim_start_matches("SARC:").split("//").collect();
        if parts.is_empty() {
            return Err("无效的 SARC 文件路径".to_string());
        }
        let physical_data = fs::read(parts[0]).map_err(|e| e.to_string())?;
        let physical_name = parts[0].split('/').last().unwrap_or(parts[0]).split('\\').last().unwrap_or(parts[0]);
        let inner_paths = if parts.len() > 1 { &parts[1..] } else { &[] };
        let final_data = delete_file_from_sarc(&physical_data, physical_name, inner_paths)?;
        fs::write(parts[0], final_data).map_err(|e| e.to_string())
    } else {
        let p = std::path::Path::new(path);
        if p.is_dir() {
            fs::remove_dir_all(p).map_err(|e| e.to_string())
        } else {
            fs::remove_file(p).map_err(|e| e.to_string())
        }
    }
}

// 重命名物理文件或 SARC 压缩包内的虚拟文件
#[tauri::command]
fn rename_file_by_path(old_path: &str, new_name: &str) -> Result<String, String> {
    if old_path.starts_with("SARC:") {
        let parts: Vec<&str> = old_path.trim_start_matches("SARC:").split("//").collect();
        if parts.is_empty() {
            return Err("无效的 SARC 路径".to_string());
        }
        let mut file_data = read_file_from_path(old_path)?;
        
        let physical_path = parts[0];
        let physical_data = fs::read(physical_path).map_err(|e| e.to_string())?;
        let physical_name = physical_path.split('/').last().unwrap_or(physical_path).split('\\').last().unwrap_or(physical_path);
        
        let inner_paths = if parts.len() > 1 { &parts[1..] } else { &[] };
        // 从 SARC 中移除原文件条目
        let intermediate_data = delete_file_from_sarc(&physical_data, physical_name, inner_paths)?;
        
        // 构造新条目的内嵌路径
        let mut new_parts: Vec<String> = parts.iter().map(|s| s.to_string()).collect();
        if new_parts.is_empty() {
            return Err("SARC 路径分段为空".to_string());
        }
        let last_idx = new_parts.len().saturating_sub(1);
        let parent_inner = if let Some((parent, _)) = new_parts[last_idx].rsplit_once('/') {
            format!("{}/", parent)
        } else {
            "".to_string()
        };
        
        let clean_new_name = if !new_name.contains('.') {
            let old_ext = old_path.split('.').last().unwrap_or("");
            if !old_ext.is_empty() {
                format!("{}.{}", new_name, old_ext)
            } else {
                new_name.to_string()
            }
        } else {
            new_name.to_string()
        };
        
        // 如果是 .bfevfl 文件，同步更新文件内部的 evfl.name 和 flowchart.name
        if clean_new_name.to_lowercase().ends_with(".bfevfl") {
            let new_base = clean_new_name.trim_end_matches(".bfevfl");
            let mut evfl = EventFlow::new();
            if std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                evfl.read(&file_data);
            })).is_ok() {
                evfl.name = new_base.to_string();
                if let Some(fc) = &mut evfl.flowchart {
                    fc.name = new_base.to_string();
                }
                let mut cur = Cursor::new(Vec::new());
                if std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    evfl.write(&mut cur);
                })).is_ok() {
                    file_data = cur.into_inner();
                }
            }
        }
        
        new_parts[last_idx] = format!("{}{}", parent_inner, clean_new_name);
        
        let new_inner_paths: Vec<&str> = if new_parts.len() > 1 {
            new_parts[1..].iter().map(|s| s.as_str()).collect()
        } else {
            Vec::new()
        };
        let final_data = repack_nested_sarc(&intermediate_data, physical_name, &new_inner_paths, &file_data)?;
        
        fs::write(physical_path, final_data).map_err(|e| e.to_string())?;
        
        let new_virtual_path = format!("SARC:{}", new_parts.join("//"));
        Ok(new_virtual_path)
    } else {
        let p = std::path::Path::new(old_path);
        let parent = p.parent().ok_or_else(|| "无法获取父级目录".to_string())?;
        let clean_new_name = if !new_name.contains('.') {
            let old_ext = old_path.split('.').last().unwrap_or("");
            if !old_ext.is_empty() {
                format!("{}.{}", new_name, old_ext)
            } else {
                new_name.to_string()
            }
        } else {
            new_name.to_string()
        };
        let new_path = parent.join(&clean_new_name);
        
        // 如果是 .bfevfl 文件，同步更新文件内部的 evfl.name 和 flowchart.name
        if clean_new_name.to_lowercase().ends_with(".bfevfl") {
            let new_base = clean_new_name.trim_end_matches(".bfevfl");
            if let Ok(data) = fs::read(p) {
                let mut evfl = EventFlow::new();
                if std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    evfl.read(&data);
                })).is_ok() {
                    evfl.name = new_base.to_string();
                    if let Some(fc) = &mut evfl.flowchart {
                        fc.name = new_base.to_string();
                    }
                    let mut cur = Cursor::new(Vec::new());
                    if std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                        evfl.write(&mut cur);
                    })).is_ok() {
                        let _ = fs::write(p, cur.into_inner());
                    }
                }
            }
        }
        
        fs::rename(p, &new_path).map_err(|e| e.to_string())?;
        Ok(new_path.to_string_lossy().to_string())
    }
}

#[tauri::command]
fn read_mod_directory(path: &str) -> Result<Vec<FileNode>, String> {
    read_dir_recursive(std::path::Path::new(path))
}

#[tauri::command]
fn is_directory(path: &str) -> bool {
    std::path::Path::new(path).is_dir()
}

mod msbt;
mod ai_def;

// 加载指定语言的全部文本字典（MessageId -> 真实文本）
#[tauri::command]
fn load_language_dict(
    platform: String,
    game_dir: String,
    update_dir: String,
    dlc_dir: String,
    mod_dir: Option<String>,
    language: String,
) -> Result<std::collections::HashMap<String, String>, String> {
    msbt::load_language_messages(&platform, &game_dir, &update_dir, &dlc_dir, mod_dir.as_deref(), &language)
}

#[tauri::command]
fn load_evfl(path: &str) -> Result<String, String> {
    let data = read_file_from_path(path)?;
    if path.to_lowercase().ends_with(".json") {
        return String::from_utf8(data).map_err(|e| e.to_string());
    }
    
    // Safety check to prevent panics in evfl.read
    if data.len() < 8 || !data.starts_with(b"BFEVFL") {
        return Err("不是有效的 BFEVFL 格式文件".to_string());
    }
    
    // 捕获可能在解析损坏 BFEVFL 二进制时发生的底层 Panic
    let mut evfl = EventFlow::new();
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        evfl.read(&data);
    }));
    
    if result.is_err() {
        return Err("解析 BFEVFL 事件流发生异常（数据可能已损坏）".to_string());
    }
    
    serde_json::to_string(&evfl).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_evfl(path: &str, json_data: &str) -> Result<(), String> {
    if path.to_lowercase().ends_with(".json") {
        return write_file_to_path(path, json_data.as_bytes());
    }
    
    let mut evfl: EventFlow = serde_json::from_str(json_data).map_err(|e| e.to_string())?;
    ensure_evfl_names(&mut evfl, path);
    let write_res = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let mut out_cursor = Cursor::new(Vec::new());
        evfl.write(&mut out_cursor);
        out_cursor.into_inner()
    }));
    let out_data = write_res.map_err(|_| "序列化 EventFlow 发生错误".to_string())?;
    
    write_file_to_path(path, &out_data)
}

#[tauri::command]
fn load_msbt(path: &str) -> Result<String, String> {
    let data = read_file_from_path(path)?;
    let msyt = msyt::Msyt::from_msbt_bytes(&data).map_err(|e| e.to_string())?;
    let json_data = serde_json::to_string(&msyt).map_err(|e| e.to_string())?;
    Ok(json_data)
}

#[tauri::command]
fn save_msbt(path: &str, json_data: &str) -> Result<(), String> {
    let msyt: msyt::Msyt = serde_json::from_str(json_data).map_err(|e| e.to_string())?;
    let msbt_bytes = msyt.into_msbt_bytes(msyt::Endianness::Little).map_err(|e| e.to_string())?;
    write_file_to_path(path, &msbt_bytes)
}

#[tauri::command]
fn load_yaml(path: &str) -> Result<serde_json::Value, String> {
    let data = read_file_from_path(path)?;
    let data = roead::yaz0::decompress(&data).unwrap_or(data);
    if data.len() >= 4 && &data[0..4] == b"AAMP" {
        let pio = roead::aamp::ParameterIO::from_binary(&data).map_err(|e| e.to_string())?;
        Ok(serde_json::json!({
            "yaml": pio.to_text(),
            "type": "aamp",
            "be": false
        }))
    } else if data.len() >= 2 && (&data[0..2] == b"BY" || &data[0..2] == b"YB") {
        let byml = roead::byml::Byml::from_binary(&data).map_err(|e| e.to_string())?;
        Ok(serde_json::json!({
            "yaml": byml.to_text(),
            "type": "byml",
            "be": &data[0..2] == b"BY"
        }))
    } else {
        Err("不支持的 YAML 二进制格式".to_string())
    }
}

#[tauri::command]
fn save_yaml(path: &str, text: &str, is_byml: bool, is_big_endian: bool) -> Result<(), String> {
    let out_data = if is_byml {
        let byml = roead::byml::Byml::from_text(text).map_err(|e| e.to_string())?;
        let endian = if is_big_endian { roead::Endian::Big } else { roead::Endian::Little };
        byml.to_binary(endian).to_vec()
    } else {
        let pio = roead::aamp::ParameterIO::from_text(text).map_err(|e| e.to_string())?;
        pio.to_binary().to_vec()
    };
    
    // Attempt Yaz0 compression if original file was compressed, or if path has .s prefix
    let needs_compress = path.to_lowercase().contains(".s") && !path.to_lowercase().ends_with(".sarc") && !path.to_lowercase().ends_with(".ssarc") && !path.to_lowercase().ends_with(".pack") && !path.to_lowercase().ends_with(".sbeventpack");
    let final_data = if needs_compress {
        roead::yaz0::compress(&out_data)
    } else {
        out_data
    };
    
    write_file_to_path(path, &final_data)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_evfl,
            save_evfl,
            auto_save_step,
            load_sbeventpack,
            load_evfl_from_pack,
            save_evfl_to_pack,
            load_editor_settings,
            save_editor_settings,
            load_language_dict,
            new_evfl,
            read_mod_directory,
            is_directory,
            create_bfevfl_file,
            delete_file_by_path,
            rename_file_by_path,
            load_msbt,
            save_msbt,
            load_yaml,
            save_yaml,
            open_settings_dir,
            open_path_in_explorer,
            open_external_url,
            clean_autosave_cache,
            import_bcml_paths,
            load_file_history,
            sync_file_history_timeline,
            ai_def::autofill_event_parameters,
            ai_def::get_actor_available_actions,
            ai_def::get_actor_available_queries,
            ai_def::reorder_event_parameters,
            ai_def::export_actor_definitions_json,
            ai_def::unpack_game_ai_data,
            ai_def::get_ai_data_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

