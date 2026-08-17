use std::collections::HashMap;
use std::path::{Path, PathBuf};

// 解析 MSBT 二进制字节数据
pub fn parse_msbt_bytes(data: &[u8]) -> Result<HashMap<String, String>, String> {
    if data.len() < 32 || &data[0..8] != b"MsgStdBn" {
        return Err("Invalid MSBT header".to_string());
    }

    let is_big_endian = data[8] == 0xFE && data[9] == 0xFF;
    let encoding = data[12]; // 0: UTF-8, 1: UTF-16
    let section_count = if is_big_endian {
        u16::from_be_bytes([data[14], data[15]])
    } else {
        u16::from_le_bytes([data[14], data[15]])
    };

    let mut offset = 32usize;
    let mut lbl1_payload: Option<&[u8]> = None;
    let mut txt2_payload: Option<&[u8]> = None;

    for _ in 0..section_count {
        if offset + 16 > data.len() {
            break;
        }
        let magic = &data[offset..offset + 4];
        let size = if is_big_endian {
            u32::from_be_bytes([data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]]) as usize
        } else {
            u32::from_le_bytes([data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]]) as usize
        };
        let payload_start = offset + 16;
        let payload_end = payload_start + size;
        if payload_end > data.len() {
            break;
        }

        if magic == b"LBL1" {
            lbl1_payload = Some(&data[payload_start..payload_end]);
        } else if magic == b"TXT2" {
            txt2_payload = Some(&data[payload_start..payload_end]);
        }

        // 对齐到 16 字节
        offset = (payload_end + 15) & !15;
    }

    let lbl1 = lbl1_payload.ok_or("Missing LBL1 section")?;
    let txt2 = txt2_payload.ok_or("Missing TXT2 section")?;

    // 解析 TXT2 (文本偏移列表)
    if txt2.len() < 4 {
        return Err("Invalid TXT2 section".to_string());
    }
    let num_strings = if is_big_endian {
        u32::from_be_bytes([txt2[0], txt2[1], txt2[2], txt2[3]]) as usize
    } else {
        u32::from_le_bytes([txt2[0], txt2[1], txt2[2], txt2[3]]) as usize
    };

    let mut text_offsets = Vec::with_capacity(num_strings);
    for i in 0..num_strings {
        let pos = 4 + i * 4;
        if pos + 4 > txt2.len() {
            break;
        }
        let off = if is_big_endian {
            u32::from_be_bytes([txt2[pos], txt2[pos + 1], txt2[pos + 2], txt2[pos + 3]]) as usize
        } else {
            u32::from_le_bytes([txt2[pos], txt2[pos + 1], txt2[pos + 2], txt2[pos + 3]]) as usize
        };
        text_offsets.push(off);
    }

    // 提取单个文本字符串内容 (自动过滤 0x0E 控制字符标签)
    let extract_string = |str_offset: usize| -> String {
        if str_offset >= txt2.len() {
            return String::new();
        }
        let raw = &txt2[str_offset..];
        if encoding == 0 {
            // UTF-8 编码
            let mut end = 0;
            while end < raw.len() && raw[end] != 0 {
                end += 1;
            }
            String::from_utf8_lossy(&raw[0..end]).to_string()
        } else {
            // UTF-16 编码
            let mut u16_chars = Vec::new();
            let mut idx = 0;
            while idx + 2 <= raw.len() {
                let code = if is_big_endian {
                    u16::from_be_bytes([raw[idx], raw[idx + 1]])
                } else {
                    u16::from_le_bytes([raw[idx], raw[idx + 1]])
                };
                if code == 0 {
                    break;
                }
                if code == 0x000E {
                    // 控制标签格式: group(2) + type(2) + len(2) + params(len)
                    if idx + 8 <= raw.len() {
                        let param_len = if is_big_endian {
                            u16::from_be_bytes([raw[idx + 6], raw[idx + 7]]) as usize
                        } else {
                            u16::from_le_bytes([raw[idx + 6], raw[idx + 7]]) as usize
                        };
                        idx += 8 + param_len;
                        continue;
                    }
                }
                u16_chars.push(code);
                idx += 2;
            }
            String::from_utf16_lossy(&u16_chars)
        }
    };

    // 解析 LBL1 (Label 标识符映射)
    if lbl1.len() < 4 {
        return Err("Invalid LBL1 section".to_string());
    }
    let num_groups = if is_big_endian {
        u32::from_be_bytes([lbl1[0], lbl1[1], lbl1[2], lbl1[3]]) as usize
    } else {
        u32::from_le_bytes([lbl1[0], lbl1[1], lbl1[2], lbl1[3]]) as usize
    };

    let mut result = HashMap::new();

    for g in 0..num_groups {
        let gpos = 4 + g * 8;
        if gpos + 8 > lbl1.len() {
            break;
        }
        let label_count = if is_big_endian {
            u32::from_be_bytes([lbl1[gpos], lbl1[gpos + 1], lbl1[gpos + 2], lbl1[gpos + 3]]) as usize
        } else {
            u32::from_le_bytes([lbl1[gpos], lbl1[gpos + 1], lbl1[gpos + 2], lbl1[gpos + 3]]) as usize
        };
        let group_offset = if is_big_endian {
            u32::from_be_bytes([lbl1[gpos + 4], lbl1[gpos + 5], lbl1[gpos + 6], lbl1[gpos + 7]]) as usize
        } else {
            u32::from_le_bytes([lbl1[gpos + 4], lbl1[gpos + 5], lbl1[gpos + 6], lbl1[gpos + 7]]) as usize
        };

        let mut cur = group_offset;
        for _ in 0..label_count {
            if cur >= lbl1.len() {
                break;
            }
            let len = lbl1[cur] as usize;
            cur += 1;
            if cur + len + 4 > lbl1.len() {
                break;
            }
            let name = String::from_utf8_lossy(&lbl1[cur..cur + len]).to_string();
            cur += len;
            let str_idx = if is_big_endian {
                u32::from_be_bytes([lbl1[cur], lbl1[cur + 1], lbl1[cur + 2], lbl1[cur + 3]]) as usize
            } else {
                u32::from_le_bytes([lbl1[cur], lbl1[cur + 1], lbl1[cur + 2], lbl1[cur + 3]]) as usize
            };
            cur += 4;

            if str_idx < text_offsets.len() {
                let text = extract_string(text_offsets[str_idx]);
                result.insert(name, text);
            }
        }
    }

    Ok(result)
}

// 递归从 SARC 及其嵌套 SARC 中提取所有 MSBT 对话字符串
fn extract_messages_from_sarc(sarc: &roead::sarc::Sarc, dict: &mut HashMap<String, String>) {
    for file in sarc.files() {
        let fname = file.name().unwrap_or("");
        let fname_lower = fname.to_lowercase();

        if fname_lower.ends_with(".msbt") {
            if let Ok(entries) = parse_msbt_bytes(file.data()) {
                let clean_name = fname.trim_end_matches(".msbt").trim_end_matches(".MSBT");
                let base_name = clean_name.split('/').last().unwrap_or(clean_name);
                for (label, text) in entries {
                    // 1. 全路径组合: EventFlowMsg/TwnObj_Village_Korok_DekuTree_A_01:DekuTree_A_01_Talk030
                    dict.insert(format!("{}:{}", clean_name, label), text.clone());
                    // 2. 短名组合: TwnObj_Village_Korok_DekuTree_A_01:DekuTree_A_01_Talk030
                    dict.insert(format!("{}:{}", base_name, label), text.clone());
                    // 3. 纯标签名: DekuTree_A_01_Talk030
                    dict.insert(label, text);
                }
            }
        } else if fname_lower.ends_with(".sarc") || fname_lower.ends_with(".ssarc") || fname_lower.ends_with(".pack") || fname.contains("Msg_") {
            let inner_data = file.data();
            let inner_decompressed = roead::yaz0::decompress(inner_data).unwrap_or_else(|_| inner_data.to_vec());
            if let Ok(inner_sarc) = roead::sarc::Sarc::new(&inner_decompressed) {
                extract_messages_from_sarc(&inner_sarc, dict);
            }
        }
    }
}

// 尝试从单文件或 SARC 归档包中读取全部 MSBT 字符串
fn extract_messages_from_pack(pack_path: &Path, dict: &mut HashMap<String, String>) {
    if !pack_path.exists() {
        return;
    }

    let Ok(data) = std::fs::read(pack_path) else { return; };
    let decompressed = roead::yaz0::decompress(&data).unwrap_or(data);
    if let Ok(sarc) = roead::sarc::Sarc::new(&decompressed) {
        extract_messages_from_sarc(&sarc, dict);
    }
}

// 尝试从独立的单体 MSBT 文件中读取字符串
fn extract_from_loose_msbt(msbt_path: &Path, dict: &mut HashMap<String, String>) {
    let Ok(data) = std::fs::read(msbt_path) else { return; };
    if let Ok(entries) = parse_msbt_bytes(&data) {
        let path_str = msbt_path.to_string_lossy().replace('\\', "/");
        let file_stem = msbt_path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
        let clean_name = if let Some(idx) = path_str.rfind("EventFlowMsg/") {
            &path_str[idx..path_str.len() - 5]
        } else if let Some(idx) = path_str.rfind("Message/") {
            &path_str[idx..path_str.len() - 5]
        } else {
            file_stem
        };

        for (label, text) in entries {
            dict.insert(format!("{}:{}", clean_name, label), text.clone());
            dict.insert(format!("{}:{}", file_stem, label), text.clone());
            dict.insert(label, text);
        }
    }
}

// 递归搜索目录中严格匹配当前语言代码的语言包归档或 MSBT 文件
fn scan_for_language_files(dir: &Path, lang: &str, depth: usize, out_files: &mut Vec<PathBuf>) {
    if depth > 10 || !dir.is_dir() {
        return;
    }
    let Ok(entries) = std::fs::read_dir(dir) else { return; };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            scan_for_language_files(&path, lang, depth + 1, out_files);
        } else if path.is_file() {
            let fname = entry.file_name().to_string_lossy().to_lowercase();
            let lang_lower = lang.to_lowercase();

            // 严格仅匹配当前配置的目标语言包文件，严禁回退匹配其他语言
            if fname == format!("bootup_{}.pack", lang_lower)
                || fname == format!("bootup_{}.sarc", lang_lower)
                || fname == format!("msg_{}.product.sarc", lang_lower)
                || fname == format!("msg_{}.product.ssarc", lang_lower)
                || fname.ends_with(".msbt")
            {
                out_files.push(path);
            }
        }
    }
}

// 根据配置的游戏路径和语言代码加载全部对话/消息字典
pub fn load_language_messages(
    platform: &str,
    game_dir: &str,
    update_dir: &str,
    dlc_dir: &str,
    mod_dir: Option<&str>,
    language: &str,
) -> Result<HashMap<String, String>, String> {
    let mut dict = HashMap::new();
    let lang = if language.is_empty() { "USen" } else { language };

    let mut search_dirs: Vec<PathBuf> = Vec::new();

    // 模组文件夹模式：严格仅从 Mod 文件夹查找，不使用设置路径，不进行外部回退
    if let Some(m_dir) = mod_dir {
        if !m_dir.is_empty() {
            search_dirs.push(PathBuf::from(m_dir));
        }
    } else {
        // 单文件模式：从设置的游戏根目录与补丁目录查找
        if platform == "switch" {
            if !game_dir.is_empty() {
                search_dirs.push(PathBuf::from(game_dir));
            }
            if !dlc_dir.is_empty() {
                search_dirs.push(PathBuf::from(dlc_dir));
            }
        } else {
            // Wii U
            if !game_dir.is_empty() {
                search_dirs.push(PathBuf::from(game_dir));
            }
            if !dlc_dir.is_empty() {
                search_dirs.push(PathBuf::from(dlc_dir));
            }
            if !update_dir.is_empty() {
                search_dirs.push(PathBuf::from(update_dir));
            }
        }
    }

    if search_dirs.is_empty() {
        return Err("未配置游戏根目录或模组文件夹路径".to_string());
    }

    // 常见固定相对路径列表（严格匹配目标语言代码）
    let candidate_names = [
        format!("Pack/Bootup_{}.pack", lang),
        format!("romfs/Pack/Bootup_{}.pack", lang),
        format!("content/Pack/Bootup_{}.pack", lang),
        format!("Bootup_{}.pack", lang),
        format!("Message/Msg_{}.product.sarc", lang),
        format!("Message/Msg_{}.product.ssarc", lang),
        format!("content/Message/Msg_{}.product.sarc", lang),
        format!("content/Message/Msg_{}.product.ssarc", lang),
        format!("romfs/Message/Msg_{}.product.sarc", lang),
        format!("romfs/Message/Msg_{}.product.ssarc", lang),
        format!("Msg_{}.product.sarc", lang),
        format!("Msg_{}.product.ssarc", lang),
    ];

    for base_dir in &search_dirs {
        let mut found_in_base = false;
        for candidate in &candidate_names {
            let full_path = base_dir.join(candidate);
            if full_path.exists() {
                extract_messages_from_pack(&full_path, &mut dict);
                found_in_base = true;
            }
        }

        // 若固定路径未命中，或当前为 Mod 文件夹（多层 TitleId/Atmosphere 结构），在目录内执行深度扫描
        let is_mod_dir = mod_dir.map_or(false, |m| base_dir == Path::new(m));
        if !found_in_base || is_mod_dir {
            let mut scanned_files = Vec::new();
            scan_for_language_files(base_dir, lang, 0, &mut scanned_files);
            for file_path in scanned_files {
                let is_msbt = file_path.extension().and_then(|s| s.to_str()).map_or(false, |ext| ext.eq_ignore_ascii_case("msbt"));
                if is_msbt {
                    extract_from_loose_msbt(&file_path, &mut dict);
                } else {
                    extract_messages_from_pack(&file_path, &mut dict);
                }
            }
        }
    }

    if dict.is_empty() {
        return Err(format!("未在配置路径中找到 {} 语言包资源", lang));
    }

    Ok(dict)
}
