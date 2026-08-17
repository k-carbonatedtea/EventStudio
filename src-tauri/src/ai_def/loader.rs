use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use roead::sarc::Sarc;
use super::parser::{parse_ai_defs, parse_baiprog, ActorAiProg, AiDefs};

// 全局 AI 定义与程序缓存管理器
#[derive(Clone, Default)]
pub struct AiCacheManager {
    pub ai_defs: Arc<RwLock<Option<AiDefs>>>,
    pub actor_progs: Arc<RwLock<HashMap<String, ActorAiProg>>>,
}

impl AiCacheManager {
    pub fn global() -> &'static AiCacheManager {
        static INSTANCE: std::sync::OnceLock<AiCacheManager> = std::sync::OnceLock::new();
        INSTANCE.get_or_init(AiCacheManager::default)
    }

    pub fn clear(&self) {
        if let Ok(mut g) = self.ai_defs.write() {
            *g = None;
        }
        if let Ok(mut g) = self.actor_progs.write() {
            g.clear();
        }
    }
}

// 自动搜集游戏及环境中的有效根目录列表
pub fn get_search_directories(
    game_dir: Option<&str>,
    update_dir: Option<&str>,
    dlc_dir: Option<&str>,
    mod_dir: Option<&str>,
    custom_dump_dir: Option<&str>,
) -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    let mut add_dir = |p: PathBuf| {
        if p.exists() && !dirs.contains(&p) {
            dirs.push(p);
        }
    };

    // 1. 自定义解包/导出目录优先
    if let Some(d) = custom_dump_dir {
        if !d.trim().is_empty() {
            add_dir(PathBuf::from(d));
        }
    }

    // 默认文档目录下的 ai_dump
    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        add_dir(PathBuf::from(user_profile).join("Documents").join("EventEditor").join("ai_dump"));
    }

    // 2. 模组目录
    if let Some(d) = mod_dir {
        if !d.trim().is_empty() {
            add_dir(PathBuf::from(d));
        }
    }

    // 3. 显式传入的游戏补丁与本体目录
    for opt in [update_dir, game_dir, dlc_dir] {
        if let Some(d) = opt {
            if !d.trim().is_empty() {
                add_dir(PathBuf::from(d));
            }
        }
    }

    // 4. 读取 Event Studio 本地配置 (Documents/EventEditor/settings.json)
    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        let app_settings = PathBuf::from(user_profile).join("Documents").join("EventEditor").join("settings.json");
        if app_settings.exists() {
            if let Ok(content) = std::fs::read_to_string(&app_settings) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(w) = val.get("wiiu") {
                        for k in ["updateDir", "gameDir", "dlcDir"] {
                            if let Some(s) = w.get(k).and_then(|v| v.as_str()) {
                                if !s.is_empty() { add_dir(PathBuf::from(s)); }
                            }
                        }
                    }
                    if let Some(s_nx) = val.get("switch") {
                        for k in ["gameDir", "dlcDir"] {
                            if let Some(s) = s_nx.get(k).and_then(|v| v.as_str()) {
                                if !s.is_empty() { add_dir(PathBuf::from(s)); }
                            }
                        }
                    }
                    if let Some(custom) = val.get("customAiDumpDir").and_then(|v| v.as_str()) {
                        if !custom.is_empty() { add_dir(PathBuf::from(custom)); }
                    }
                }
            }
        }
    }

    dirs
}

// 尝试加载全局 AIDef_Game.product.sbyml
pub fn load_global_ai_defs(search_dirs: &[PathBuf]) -> Result<AiDefs, String> {
    let cache = AiCacheManager::global();
    {
        let read_guard = cache.ai_defs.read().map_err(|e| e.to_string())?;
        if let Some(defs) = &*read_guard {
            return Ok(defs.clone());
        }
    }

    // 搜索候选相对路径
    let relative_paths = [
        "Pack/Bootup.pack/Actor/AIDef/AIDef_Game.product.sbyml",
        "content/Pack/Bootup.pack/Actor/AIDef/AIDef_Game.product.sbyml",
        "romfs/Pack/Bootup.pack/Actor/AIDef/AIDef_Game.product.sbyml",
        "Actor/AIDef/AIDef_Game.product.sbyml",
        "Bootup.pack",
        "Pack/Bootup.pack",
        "content/Pack/Bootup.pack",
        "romfs/Pack/Bootup.pack",
    ];

    for base in search_dirs {
        for rel in &relative_paths {
            let full_path = base.join(rel);
            if full_path.exists() {
                if full_path.is_file() {
                    let fname = full_path.file_name().unwrap_or_default().to_string_lossy().to_lowercase();
                    if fname.ends_with(".sbyml") || fname.ends_with(".byml") {
                        if let Ok(bytes) = std::fs::read(&full_path) {
                            if let Ok(defs) = parse_ai_defs(&bytes) {
                                if !defs.actions.is_empty() {
                                    let mut write_guard = cache.ai_defs.write().map_err(|e| e.to_string())?;
                                    *write_guard = Some(defs.clone());
                                    return Ok(defs);
                                }
                            }
                        }
                    } else if fname.ends_with(".pack") || fname.ends_with(".sarc") {
                        if let Ok(bytes) = std::fs::read(&full_path) {
                            let uncompressed = roead::yaz0::decompress(&bytes).unwrap_or(bytes);
                            if let Ok(sarc) = Sarc::new(&uncompressed) {
                                if let Some(file) = sarc.files().find(|f| {
                                    f.name().map_or(false, |n| n.ends_with("AIDef_Game.product.sbyml") || n.ends_with("AIDef_Game.product.byml"))
                                }) {
                                    if let Ok(defs) = parse_ai_defs(file.data()) {
                                        if !defs.actions.is_empty() {
                                            let mut write_guard = cache.ai_defs.write().map_err(|e| e.to_string())?;
                                            *write_guard = Some(defs.clone());
                                            return Ok(defs);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Err("未在搜索路径中找到有效的 AIDef_Game.product.sbyml 定义文件".to_string())
}

// 尝试读取指定角色的 AI 程序定义 (.baiprog)
pub fn load_actor_aiprog(actor_name: &str, search_dirs: &[PathBuf]) -> Result<ActorAiProg, String> {
    let cache = AiCacheManager::global();
    {
        let read_guard = cache.actor_progs.read().map_err(|e| e.to_string())?;
        if let Some(prog) = read_guard.get(actor_name) {
            return Ok(prog.clone());
        }
    }

    let mut prog = ActorAiProg::default();

    // 1. 查找解包后的 loose .baiprog 文件
    for base in search_dirs {
        let loose_dir = base.join("Actor").join("Pack").join(format!("{}.sbactorpack", actor_name)).join("Actor").join("AIProgram");
        if loose_dir.exists() && loose_dir.is_dir() {
            if let Ok(entries) = std::fs::read_dir(&loose_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().map_or(false, |ext| ext == "baiprog") {
                        if let Ok(bytes) = std::fs::read(&path) {
                            let _ = parse_baiprog(&bytes, &mut prog);
                        }
                    }
                }
            }
        }
        if !prog.actions.is_empty() || !prog.queries.is_empty() {
            let mut write_guard = cache.actor_progs.write().map_err(|e| e.to_string())?;
            write_guard.insert(actor_name.to_string(), prog.clone());
            return Ok(prog);
        }
    }

    // 2. 查找 .sbactorpack 文件 (SARC 包内提取)
    let pack_rel_paths = [
        format!("Actor/Pack/{}.sbactorpack", actor_name),
        format!("content/Actor/Pack/{}.sbactorpack", actor_name),
        format!("romfs/Actor/Pack/{}.sbactorpack", actor_name),
    ];

    for base in search_dirs {
        for rel in &pack_rel_paths {
            let pack_path = base.join(rel);
            if pack_path.exists() && pack_path.is_file() {
                if let Ok(pack_bytes) = std::fs::read(&pack_path) {
                    let uncompressed = roead::yaz0::decompress(&pack_bytes).unwrap_or(pack_bytes);
                    if let Ok(sarc) = Sarc::new(&uncompressed) {
                        for f in sarc.files() {
                            if f.name().map_or(false, |n| n.ends_with(".baiprog")) {
                                let _ = parse_baiprog(f.data(), &mut prog);
                            }
                        }
                    }
                }
            }
            if !prog.actions.is_empty() || !prog.queries.is_empty() {
                let mut write_guard = cache.actor_progs.write().map_err(|e| e.to_string())?;
                write_guard.insert(actor_name.to_string(), prog.clone());
                return Ok(prog);
            }
        }
    }

    // 3. 查找 Pack/*.pack 内嵌的 sbactorpack
    let big_packs = ["Bootup.pack", "TitleBG.pack", "Title.pack", "RemainsWind.pack", "RemainsElectric.pack", "RemainsWater.pack", "RemainsFire.pack"];
    for base in search_dirs {
        for p_name in &big_packs {
            for sub in ["Pack", "content/Pack", "romfs/Pack", ""] {
                let p_path = if sub.is_empty() { base.join(p_name) } else { base.join(sub).join(p_name) };
                if p_path.exists() && p_path.is_file() {
                    if let Ok(p_bytes) = std::fs::read(&p_path) {
                        let uncompressed = roead::yaz0::decompress(&p_bytes).unwrap_or(p_bytes);
                        if let Ok(big_sarc) = Sarc::new(&uncompressed) {
                            let target_sbactorpack = format!("{}.sbactorpack", actor_name);
                            if let Some(actor_file) = big_sarc.files().find(|f| f.name().map_or(false, |n| n.ends_with(&target_sbactorpack))) {
                                let actor_uncompressed = roead::yaz0::decompress(actor_file.data()).unwrap_or_else(|_| actor_file.data().to_vec());
                                if let Ok(actor_sarc) = Sarc::new(&actor_uncompressed) {
                                    for f in actor_sarc.files() {
                                        if f.name().map_or(false, |n| n.ends_with(".baiprog")) {
                                            let _ = parse_baiprog(f.data(), &mut prog);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if !prog.actions.is_empty() || !prog.queries.is_empty() {
                    let mut write_guard = cache.actor_progs.write().map_err(|e| e.to_string())?;
                    write_guard.insert(actor_name.to_string(), prog.clone());
                    return Ok(prog);
                }
            }
        }
    }

    if !prog.actions.is_empty() || !prog.queries.is_empty() {
        let mut write_guard = cache.actor_progs.write().map_err(|e| e.to_string())?;
        write_guard.insert(actor_name.to_string(), prog.clone());
        Ok(prog)
    } else {
        Err(format!("未能加载角色 {} 的 AI 程序", actor_name))
    }
}

