pub mod parser;
pub mod loader;
pub mod unpacker;

use std::path::PathBuf;
use serde::Serialize;
use revfl::evfl::EventFlow;
use tauri::Manager;

pub use unpacker::UnpackResult;

// AI 数据状态返回结构
#[derive(Serialize)]
pub struct AiDataStatus {
    pub is_loaded: bool,
    pub actions_count: usize,
    pub queries_count: usize,
    pub actors_count: usize,
    pub source_path: String,
}

// 辅助函数：从前端传入的环境参数构建统一搜索目录列表
fn build_search_dirs(
    game_dir: Option<&str>,
    update_dir: Option<&str>,
    dlc_dir: Option<&str>,
    mod_dir: Option<&str>,
    custom_dump_dir: Option<&str>,
) -> Vec<PathBuf> {
    loader::get_search_directories(game_dir, update_dir, dlc_dir, mod_dir, custom_dump_dir)
}

// 核心命令：为事件参数执行自动填充 (Auto Fill)
#[tauri::command]
pub fn autofill_event_parameters(
    actor_name: &str,
    action_query_name: &str,
    is_query: bool,
    game_dir: Option<String>,
    update_dir: Option<String>,
    dlc_dir: Option<String>,
    mod_dir: Option<String>,
    custom_dump_dir: Option<String>,
) -> Result<serde_json::Value, String> {
    let search_dirs = build_search_dirs(
        game_dir.as_deref(),
        update_dir.as_deref(),
        dlc_dir.as_deref(),
        mod_dir.as_deref(),
        custom_dump_dir.as_deref(),
    );

    let prog = loader::load_actor_aiprog(actor_name, &search_dirs)
        .map_err(|_| format!("未能加载角色 {} 的 AI 程序", actor_name))?;

    let class_name = if is_query {
        prog.queries.get(action_query_name)
    } else {
        prog.actions.get(action_query_name)
    }.ok_or_else(|| format!("所选动作/查询 {} 未在角色 {} 的 AI 程序中注册", action_query_name, actor_name))?;

    let defs = loader::load_global_ai_defs(&search_dirs)
        .map_err(|_| "未能加载游戏全局 AI 定义 (AIDef_Game.product.sbyml)".to_string())?;

    let class_def = if is_query {
        defs.queries.get(class_name)
    } else {
        defs.actions.get(class_name)
    }.ok_or_else(|| format!("未在全局 AI 定义中找到类 {} 的定义", class_name))?;

    let mut result_params = serde_json::Map::new();
    if !is_query {
        result_params.insert("IsWaitFinish".to_string(), serde_json::json!({ "Bool": false }));
    }

    for p in &class_def.params {
        let param_type = if p.param_type.is_empty() { "String" } else { &p.param_type };
        result_params.insert(p.name.clone(), serde_json::json!({ param_type: p.default_value.clone() }));
    }

    Ok(serde_json::Value::Object(result_params))
}

// 核心命令：获取指定角色全部可用的 Action 列表 (用于智能补全)
#[tauri::command]
pub fn get_actor_available_actions(
    actor_name: &str,
    game_dir: Option<String>,
    update_dir: Option<String>,
    dlc_dir: Option<String>,
    mod_dir: Option<String>,
    custom_dump_dir: Option<String>,
) -> Result<Vec<String>, String> {
    let search_dirs = build_search_dirs(
        game_dir.as_deref(),
        update_dir.as_deref(),
        dlc_dir.as_deref(),
        mod_dir.as_deref(),
        custom_dump_dir.as_deref(),
    );

    if let Ok(prog) = loader::load_actor_aiprog(actor_name, &search_dirs) {
        let mut list: Vec<String> = prog.actions.keys().cloned().collect();
        list.sort();
        return Ok(list);
    }

    Ok(Vec::new())
}

// 核心命令：获取指定角色全部可用的 Query 列表 (用于智能补全)
#[tauri::command]
pub fn get_actor_available_queries(
    actor_name: &str,
    game_dir: Option<String>,
    update_dir: Option<String>,
    dlc_dir: Option<String>,
    mod_dir: Option<String>,
    custom_dump_dir: Option<String>,
) -> Result<Vec<String>, String> {
    let search_dirs = build_search_dirs(
        game_dir.as_deref(),
        update_dir.as_deref(),
        dlc_dir.as_deref(),
        mod_dir.as_deref(),
        custom_dump_dir.as_deref(),
    );

    if let Ok(prog) = loader::load_actor_aiprog(actor_name, &search_dirs) {
        let mut list: Vec<String> = prog.queries.keys().cloned().collect();
        list.sort();
        return Ok(list);
    }

    Ok(Vec::new())
}

// 核心命令：参数智能排序 (Reorder)
#[tauri::command]
pub fn reorder_event_parameters(
    actor_name: &str,
    action_query_name: &str,
    is_query: bool,
    current_params: serde_json::Value,
    game_dir: Option<String>,
    update_dir: Option<String>,
    dlc_dir: Option<String>,
    mod_dir: Option<String>,
    custom_dump_dir: Option<String>,
) -> Result<serde_json::Value, String> {
    let current_map = current_params.as_object().ok_or("Invalid params format")?;
    let search_dirs = build_search_dirs(
        game_dir.as_deref(),
        update_dir.as_deref(),
        dlc_dir.as_deref(),
        mod_dir.as_deref(),
        custom_dump_dir.as_deref(),
    );

    let mut ordered_keys: Vec<String> = Vec::new();
    if !is_query {
        ordered_keys.push("IsWaitFinish".to_string());
    }

    if let Ok(prog) = loader::load_actor_aiprog(actor_name, &search_dirs) {
        let ai_class_name = if is_query { prog.queries.get(action_query_name) } else { prog.actions.get(action_query_name) };
        if let Some(class_name) = ai_class_name {
            if let Ok(defs) = loader::load_global_ai_defs(&search_dirs) {
                let class_def_opt = if is_query { defs.queries.get(class_name) } else { defs.actions.get(class_name) };
                if let Some(class_def) = class_def_opt {
                    for p in &class_def.params {
                        if !ordered_keys.contains(&p.name) {
                            ordered_keys.push(p.name.clone());
                        }
                    }
                }
            }
        }
    }

    let mut result_map = serde_json::Map::new();
    for key in &ordered_keys {
        if let Some(val) = current_map.get(key) {
            result_map.insert(key.clone(), val.clone());
        }
    }
    for (k, v) in current_map {
        if !result_map.contains_key(k) {
            result_map.insert(k.clone(), v.clone());
        }
    }

    Ok(serde_json::Value::Object(result_map))
}

// 核心命令：将当前流程图的角色与事件参数定义导出到 JSON 文件
#[tauri::command]
pub fn export_actor_definitions_json(evfl_json: &str, export_path: &str) -> Result<(), String> {
    let evfl: EventFlow = serde_json::from_str(evfl_json).map_err(|e| e.to_string())?;
    let fc = evfl.flowchart.ok_or("Flowchart is empty")?;

    let mut defs_map: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();

    // 1. 初始化所有角色及其 Action/Query 骨架
    for actor in &fc.actors {
        let actor_name = actor.identifier.name.clone();
        let mut actor_entry = serde_json::Map::new();
        let mut actions_map = serde_json::Map::new();
        let mut queries_map = serde_json::Map::new();

        for act in &actor.actions {
            actions_map.insert(act.0.clone(), serde_json::json!({}));
        }
        for q in &actor.queries {
            queries_map.insert(q.0.clone(), serde_json::json!({}));
        }

        actor_entry.insert("actions".to_string(), serde_json::Value::Object(actions_map));
        actor_entry.insert("queries".to_string(), serde_json::Value::Object(queries_map));
        defs_map.insert(actor_name, serde_json::Value::Object(actor_entry));
    }

    // 2. 从事件节点中提取所有具体参数填充到对应动作/查询中
    for event in &fc.events {
        let (actor_idx_opt, action_name_opt, is_query, params_opt) = match &event.data {
            revfl::event::EventData::Action(act_ev) => {
                let a_idx = act_ev.actor.idx as usize;
                let act_name = if act_ev.actor_action.idx != 0xFFFF {
                    fc.actors.get(a_idx).and_then(|a| a.actions.get(act_ev.actor_action.idx as usize)).map(|s| s.0.clone())
                } else {
                    None
                };
                (if act_ev.actor.idx != 0xFFFF { Some(a_idx) } else { None }, act_name, false, act_ev.params.as_ref())
            }
            revfl::event::EventData::Switch(sw_ev) => {
                let a_idx = sw_ev.actor.idx as usize;
                let q_name = if sw_ev.actor_query.idx != 0xFFFF {
                    fc.actors.get(a_idx).and_then(|a| a.queries.get(sw_ev.actor_query.idx as usize)).map(|s| s.0.clone())
                } else {
                    None
                };
                (if sw_ev.actor.idx != 0xFFFF { Some(a_idx) } else { None }, q_name, true, sw_ev.params.as_ref())
            }
            _ => (None, None, false, None),
        };

        if let (Some(a_idx), Some(name), Some(params)) = (actor_idx_opt, action_name_opt, params_opt) {
            if let Some(actor) = fc.actors.get(a_idx) {
                let actor_name = &actor.identifier.name;
                let cat_key = if is_query { "queries" } else { "actions" };

                if let Some(actor_obj) = defs_map.get_mut(actor_name).and_then(|v| v.as_object_mut()) {
                    if let Some(cat_obj) = actor_obj.get_mut(cat_key).and_then(|v| v.as_object_mut()) {
                        let target_map = cat_obj.entry(name).or_insert_with(|| serde_json::json!({})).as_object_mut();
                        if let Some(tgt) = target_map {
                            for (pk, pv) in &params.data {
                                if !tgt.contains_key(pk) {
                                    tgt.insert(pk.clone(), serde_json::to_value(pv).unwrap_or_default());
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    let json_text = serde_json::to_string_pretty(&defs_map).map_err(|e| e.to_string())?;
    std::fs::write(export_path, json_text).map_err(|e| e.to_string())?;
    Ok(())
}

// 核心命令：原生一键异步多线程解包 AI 数据（不阻塞主 UI 线程）
#[tauri::command]
pub async fn unpack_game_ai_data(
    app_handle: tauri::AppHandle,
    game_dir: Option<String>,
    update_dir: Option<String>,
    custom_output_dir: Option<String>,
) -> Result<UnpackResult, String> {
    let docs_dir = app_handle.path().document_dir().map_err(|e| e.to_string())?;
    let out_dir = match custom_output_dir {
        Some(d) if !d.trim().is_empty() => PathBuf::from(d),
        _ => docs_dir.join("EventEditor").join("ai_dump"),
    };

    tauri::async_runtime::spawn_blocking(move || {
        unpacker::unpack_game_ai(game_dir.as_deref(), update_dir.as_deref(), &out_dir)
    })
    .await
    .map_err(|e| e.to_string())?
}

// 核心命令：查询当前 AI 数据的状态与加载信息
#[tauri::command]
pub fn get_ai_data_status(
    game_dir: Option<String>,
    update_dir: Option<String>,
    dlc_dir: Option<String>,
    mod_dir: Option<String>,
    custom_dump_dir: Option<String>,
) -> Result<AiDataStatus, String> {
    let search_dirs = build_search_dirs(
        game_dir.as_deref(),
        update_dir.as_deref(),
        dlc_dir.as_deref(),
        mod_dir.as_deref(),
        custom_dump_dir.as_deref(),
    );

    if let Ok(defs) = loader::load_global_ai_defs(&search_dirs) {
        let actors_count = loader::AiCacheManager::global().actor_progs.read().map(|g| g.len()).unwrap_or(0);
        return Ok(AiDataStatus {
            is_loaded: true,
            actions_count: defs.actions.len(),
            queries_count: defs.queries.len(),
            actors_count,
            source_path: search_dirs.first().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
        });
    }

    Ok(AiDataStatus {
        is_loaded: false, actions_count: 0, queries_count: 0, actors_count: 0, source_path: String::new(),
    })
}
