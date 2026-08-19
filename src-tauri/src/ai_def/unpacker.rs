use std::fs;
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use std::sync::Mutex;
use rayon::prelude::*;
use roead::sarc::Sarc;
use super::parser::{parse_baiprog, ActorAiProg};
use super::loader::{get_search_directories, AiCacheManager};

// 解包结果汇总信息
#[derive(serde::Serialize)]
pub struct UnpackResult {
    pub success: bool,
    pub output_dir: String,
    pub aidef_found: bool,
    pub actors_unpacked: usize,
    pub baiprog_count: usize,
    pub message: String,
}

// 辅助函数：从单个 SARC 归档中提取所有 .baiprog 文件
fn extract_baiprogs_from_sarc(sarc: &Sarc, output_actor_dir: &Path) -> usize {
    let mut count = 0;
    for file in sarc.files() {
        if let Some(name) = file.name() {
            if name.ends_with(".baiprog") {
                let file_name = Path::new(name).file_name().unwrap_or_else(|| std::ffi::OsStr::new(name));
                let out_file = output_actor_dir.join("Actor").join("AIProgram").join(file_name);
                if let Some(parent) = out_file.parent() {
                    let _ = fs::create_dir_all(parent);
                }
                if fs::write(&out_file, file.data()).is_ok() {
                    count += 1;
                }
            }
        }
    }
    count
}

// 辅助函数：解包并提取单个 .sbactorpack 数据
fn process_sbactorpack_bytes(
    bytes: &[u8],
    actor_filename: &str,
    target_output_dir: &Path,
) -> Option<(String, ActorAiProg, usize)> {
    let uncompressed = roead::yaz0::decompress(bytes).unwrap_or_else(|_| bytes.to_vec());
    let sarc = Sarc::new(&uncompressed).ok()?;

    let out_actor_dir = target_output_dir.join("Actor").join("Pack").join(actor_filename);
    let extracted = extract_baiprogs_from_sarc(&sarc, &out_actor_dir);
    if extracted > 0 {
        let actor_name = actor_filename.trim_end_matches(".sbactorpack").to_string();
        let mut prog = ActorAiProg::default();
        for f in sarc.files() {
            if f.name().map_or(false, |n| n.ends_with(".baiprog")) {
                let _ = parse_baiprog(f.data(), &mut prog);
            }
        }
        Some((actor_name, prog, extracted))
    } else {
        None
    }
}

// 提取 AIDef 文件
fn extract_aidef_file(search_roots: &[PathBuf], target_output_dir: &Path) -> bool {
    for root in search_roots {
        let bootup_candidates = [
            root.join("Pack").join("Bootup.pack"),
            root.join("content").join("Pack").join("Bootup.pack"),
            root.join("romfs").join("Pack").join("Bootup.pack"),
            root.join("Bootup.pack"),
        ];

        for bootup_path in &bootup_candidates {
            if !bootup_path.is_file() {
                continue;
            }
            if let Ok(bytes) = fs::read(bootup_path) {
                let uncompressed = roead::yaz0::decompress(&bytes).unwrap_or(bytes);
                if let Ok(sarc) = Sarc::new(&uncompressed) {
                    if let Some(f) = sarc.files().find(|f| f.name().map_or(false, |n| n.ends_with("AIDef_Game.product.sbyml"))) {
                        let out1 = target_output_dir.join("Actor").join("AIDef").join("AIDef_Game.product.sbyml");
                        let out2 = target_output_dir.join("Pack").join("Bootup.pack").join("Actor").join("AIDef").join("AIDef_Game.product.sbyml");
                        if let Some(p) = out1.parent() { let _ = fs::create_dir_all(p); }
                        if let Some(p) = out2.parent() { let _ = fs::create_dir_all(p); }
                        let _ = fs::write(&out1, f.data());
                        let _ = fs::write(&out2, f.data());
                        return true;
                    }
                }
            }
        }
    }
    false
}

// 原生多线程并发解包 AI 定义与程序
pub fn unpack_game_ai(
    game_dir: Option<&str>,
    update_dir: Option<&str>,
    target_output_dir: &Path,
) -> Result<UnpackResult, String> {
    let _ = fs::create_dir_all(target_output_dir);

    // 收集所有有效候选根目录（不含 BCML）
    let search_roots = get_search_directories(game_dir, update_dir, None, None, None);

    // 1. 查找并提取 AIDef_Game.product.sbyml
    let aidef_found = extract_aidef_file(&search_roots, target_output_dir);

    let actor_prog_map: Mutex<HashMap<String, ActorAiProg>> = Mutex::new(HashMap::new());
    let mut total_baiprogs = 0;
    let mut total_actors = 0;

    // 2. 收集所有独立 Actor/Pack/*.sbactorpack 路径
    let mut loose_actor_files = Vec::new();
    for root in &search_roots {
        for sub in ["Actor/Pack", "content/Actor/Pack", "romfs/Actor/Pack"] {
            let pdir = root.join(sub);
            if pdir.is_dir() {
                if let Ok(entries) = fs::read_dir(&pdir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() && path.extension().map_or(false, |ext| ext == "sbactorpack") {
                            loose_actor_files.push(path);
                        }
                    }
                }
            }
        }
    }

    // 并行处理独立 actorpack
    let loose_results: Vec<(String, ActorAiProg, usize)> = loose_actor_files
        .par_iter()
        .filter_map(|path| {
            let filename = path.file_name()?.to_string_lossy().to_string();
            let bytes = fs::read(path).ok()?;
            process_sbactorpack_bytes(&bytes, &filename, target_output_dir)
        })
        .collect();

    for (name, prog, count) in loose_results {
        total_baiprogs += count;
        total_actors += 1;
        let mut map = actor_prog_map.lock().unwrap_or_else(|p| p.into_inner());
        map.insert(name, prog);
    }

    // 3. 收集所有 Pack/*.pack 路径
    let mut pack_files = Vec::new();
    for root in &search_roots {
        for sub in ["Pack", "content/Pack", "romfs/Pack"] {
            let pdir = root.join(sub);
            if pdir.is_dir() {
                if let Ok(entries) = fs::read_dir(&pdir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() && path.extension().map_or(false, |ext| ext == "pack") {
                            pack_files.push(path);
                        }
                    }
                }
            }
        }
    }

    // 并行处理内嵌 actorpack 的 big packs
    let pack_results: Vec<Vec<(String, ActorAiProg, usize)>> = pack_files
        .par_iter()
        .filter_map(|path| {
            let bytes = fs::read(path).ok()?;
            let uncompressed = roead::yaz0::decompress(&bytes).unwrap_or(bytes);
            let big_sarc = Sarc::new(&uncompressed).ok()?;
            let mut list = Vec::new();
            for f in big_sarc.files() {
                if let Some(fname) = f.name() {
                    if fname.ends_with(".sbactorpack") {
                        let actor_filename = Path::new(fname).file_name()?.to_string_lossy().to_string();
                        if let Some(res) = process_sbactorpack_bytes(f.data(), &actor_filename, target_output_dir) {
                            list.push(res);
                        }
                    }
                }
            }
            Some(list)
        })
        .collect();

    for list in pack_results {
        for (name, prog, count) in list {
            total_baiprogs += count;
            total_actors += 1;
            let mut map = actor_prog_map.lock().unwrap_or_else(|p| p.into_inner());
            map.insert(name, prog);
        }
    }

    // 4. 生成统一整合的 actor_definitions.json
    let json_path = target_output_dir.join("actor_definitions.json");
    let mut export_json = serde_json::Map::new();
    {
        let map = actor_prog_map.lock().unwrap_or_else(|p| p.into_inner());
        for (actor_name, prog) in map.iter() {
            let mut actor_obj = serde_json::Map::new();
            let mut actions_obj = serde_json::Map::new();
            for act in prog.actions.keys() {
                actions_obj.insert(act.clone(), serde_json::json!({}));
            }
            let mut queries_obj = serde_json::Map::new();
            for q in prog.queries.keys() {
                queries_obj.insert(q.clone(), serde_json::json!({}));
            }
            actor_obj.insert("actions".to_string(), serde_json::Value::Object(actions_obj));
            actor_obj.insert("queries".to_string(), serde_json::Value::Object(queries_obj));
            export_json.insert(actor_name.clone(), serde_json::Value::Object(actor_obj));
        }
    }
    let _ = fs::write(json_path, serde_json::to_string_pretty(&export_json).unwrap_or_default());

    // 5. 刷新全局 AI 缓存
    AiCacheManager::global().clear();

    Ok(UnpackResult {
        success: aidef_found || total_actors > 0,
        output_dir: target_output_dir.to_string_lossy().to_string(),
        aidef_found,
        actors_unpacked: total_actors,
        baiprog_count: total_baiprogs,
        message: if aidef_found {
            format!("解包成功！已提取 {} 个角色的 AI 程序库", total_actors)
        } else {
            "未找到 AIDef 文件，请确认游戏路径配置".to_string()
        },
    })
}
