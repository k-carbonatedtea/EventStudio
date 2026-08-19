// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // 禁用 WebView2 (Chromium) 默认的后台设备发现、mDNS/SSDP 及网络探针，防止沙箱误判为网络扫描/WOL木马
    #[cfg(target_os = "windows")]
    {
        std::env::set_var(
            "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
            "--disable-features=MediaRouter,DialMediaRouteProvider --disable-background-networking --no-pings --disable-domain-reliability",
        );
    }

    tauri_app_lib::run()
}
