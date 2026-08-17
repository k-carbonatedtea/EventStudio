use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use roead::byml::Byml;
use roead::aamp::{ParameterIO, Parameter};

// AI 动态参数定义结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiParamDef {
    pub name: String,
    pub param_type: String,
    pub default_value: serde_json::Value,
}

// 单个 AI 类的参数定义集合
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AiClassDef {
    pub params: Vec<AiParamDef>,
}

// 游戏全局 AI 定义集合（包含全部 Action 与 Query）
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AiDefs {
    pub actions: HashMap<String, AiClassDef>,
    pub queries: HashMap<String, AiClassDef>,
}

// 角色 AI 程序定义（包含动作名/查询名与其绑定的 AI 逻辑类名）
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ActorAiProg {
    pub actions: HashMap<String, String>, // Action Name -> ClassName (如 "Demo_Talk" -> "ActionDemoTalk")
    pub queries: HashMap<String, String>, // Query Name -> ClassName (如 "CheckFlag" -> "QueryCheckFlag")
}

// 解析 Byml 中的值转化为 serde_json::Value
fn byml_to_json(byml: &Byml) -> Option<serde_json::Value> {
    match byml {
        Byml::Bool(b) => Some(serde_json::json!(b)),
        Byml::I32(i) => Some(serde_json::json!(i)),
        Byml::U32(u) => Some(serde_json::json!(u)),
        Byml::I64(i) => Some(serde_json::json!(i)),
        Byml::U64(u) => Some(serde_json::json!(u)),
        Byml::Float(f) => Some(serde_json::json!(f)),
        Byml::Double(f) => Some(serde_json::json!(f)),
        Byml::String(s) => Some(serde_json::json!(s.as_str())),
        Byml::Array(arr) => {
            let list: Vec<serde_json::Value> = arr.iter().filter_map(byml_to_json).collect();
            Some(serde_json::json!(list))
        }
        Byml::Map(m) => {
            let mut map = serde_json::Map::new();
            for (k, v) in m {
                if let Some(jv) = byml_to_json(v) {
                    map.insert(k.to_string(), jv);
                }
            }
            Some(serde_json::Value::Object(map))
        }
        _ => None,
    }
}

// 根据类型名获取默认值
fn get_default_for_type(type_name: &str) -> serde_json::Value {
    match type_name {
        "Bool" => serde_json::json!(false),
        "Int" => serde_json::json!(0),
        "Float" => serde_json::json!(0.0),
        "String" => serde_json::json!(""),
        "Vec3" => serde_json::json!([0.0, 0.0, 0.0]),
        _ => serde_json::json!(""),
    }
}

// 解析 AIDef_Game.product.sbyml 二进制数据
pub fn parse_ai_defs(data: &[u8]) -> Result<AiDefs, String> {
    let uncompressed = roead::yaz0::decompress(data).unwrap_or_else(|_| data.to_vec());
    let byml = Byml::from_binary(&uncompressed).map_err(|e| e.to_string())?;
    let root_map = byml.as_map().map_err(|e| e.to_string())?;

    let mut result = AiDefs::default();

    // 辅助解析函数：遍历 Actions 或 Querys 字典
    let parse_category = |category_name: &str, target: &mut HashMap<String, AiClassDef>| {
        let cat_val = root_map.get(category_name);
        if let Some(cat_byml) = cat_val {
            if let Ok(class_map) = cat_byml.as_map() {
                for (class_name, class_byml) in class_map {
                    if let Ok(obj_map) = class_byml.as_map() {
                        if let Some(dyn_params_val) = obj_map.get("DynamicInstParams") {
                            if let Ok(param_arr) = dyn_params_val.as_array() {
                                let mut class_def = AiClassDef::default();
                                for p_byml in param_arr {
                                    if let Ok(p_map) = p_byml.as_map() {
                                        let name = p_map.get("Name")
                                            .and_then(|v| v.as_string().ok())
                                            .map(|s| s.as_str())
                                            .unwrap_or("")
                                            .to_string();
                                        let p_type = p_map.get("Type")
                                            .and_then(|v| v.as_string().ok())
                                            .map(|s| s.as_str())
                                            .unwrap_or("String")
                                            .to_string();
                                        let is_ignored = matches!(p_type.as_str(), "AITreeVariablePointer" | "MesTransceiverId" | "BaseProcHandle" | "Actor");
                                        if !name.is_empty() && !is_ignored {
                                            let default_val = p_map.get("Value")
                                                .and_then(byml_to_json)
                                                .unwrap_or_else(|| get_default_for_type(&p_type));
                                            class_def.params.push(AiParamDef {
                                                name,
                                                param_type: p_type,
                                                default_value: default_val,
                                            });
                                        }
                                    }
                                }
                                target.insert(class_name.to_string(), class_def);
                            }
                        }
                    }
                }
            }
        }
    };

    parse_category("Actions", &mut result.actions);
    parse_category("Querys", &mut result.queries);
    if result.queries.is_empty() {
        parse_category("Queries", &mut result.queries);
    }

    Ok(result)
}

// 提取 AAMP 参数中的字符串内容
fn extract_aamp_string(param: &Parameter) -> Option<String> {
    match param {
        Parameter::StringRef(s) => Some(s.as_str().to_string()),
        Parameter::String32(s) => Some(s.as_str().to_string()),
        Parameter::String64(s) => Some(s.as_str().to_string()),
        Parameter::String256(s) => Some(s.as_str().to_string()),
        _ => None,
    }
}

// 解析单个 .baiprog 文件 (AAMP ParameterIO 格式)
pub fn parse_baiprog(data: &[u8], prog: &mut ActorAiProg) -> Result<(), String> {
    let uncompressed = roead::yaz0::decompress(data).unwrap_or_else(|_| data.to_vec());
    let pio = ParameterIO::from_binary(&uncompressed).map_err(|e| e.to_string())?;

    // 辅助解析列表：遍历 Action 或 Query 列表
    let parse_list = |list_name: &str, target: &mut HashMap<String, String>| {
        if let Some(list) = pio.param_root.lists.get(list_name) {
            for (_, item_list) in list.lists.iter() {
                if let Some(def_obj) = item_list.objects.get("Def") {
                    let mut class_name = String::new();
                    let mut name = String::new();

                    for (param_name, param_val) in def_obj.0.iter() {
                        if param_name == &roead::aamp::Name::from("ClassName") {
                            if let Some(s) = extract_aamp_string(param_val) {
                                class_name = s;
                            }
                        } else if param_name == &roead::aamp::Name::from("Name") {
                            if let Some(s) = extract_aamp_string(param_val) {
                                name = s;
                            }
                        }
                    }

                    if !class_name.is_empty() {
                        let final_name = if !name.is_empty() { name } else { class_name.clone() };
                        target.insert(final_name, class_name);
                    }
                }
            }
        }
    };

    parse_list("Action", &mut prog.actions);
    parse_list("Query", &mut prog.queries);

    Ok(())
}
