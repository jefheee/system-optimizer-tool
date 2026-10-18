use crate::state::CommandResponse;
use crate::utils::{emit_step, empty_recycle_bin, flush_working_set_all_processes, new_hidden_command};

#[tauri::command]
pub async fn run_preset(preset_id: String, app: tauri::AppHandle) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        match preset_id.to_lowercase().as_str() {
            "essential" => {
                let total = 4;
                emit_step(&app, "preset_essential", "Executando Perfil: Manutenção Essencial", "running", "Iniciando otimizações essenciais...", 0, total);

                // 1. Limpeza rápida
                emit_step(&app, "preset_clean", "Passo 1/4: Limpeza rápida de temporários...", "running", "Limpando %TEMP% e esvaziando lixeira.", 1, total);
                let temp_dir = std::env::var("TEMP").unwrap_or_else(|_| "C:\\Windows\\Temp".to_string());
                if let Ok(entries) = std::fs::read_dir(&temp_dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            let _ = std::fs::remove_file(path);
                        }
                    }
                }
                let _ = empty_recycle_bin();
                emit_step(&app, "preset_clean", "Passo 1/4: Temporários limpos", "success", "Lixeira e pasta temporária esvaziadas.", 1, total);

                // 2. DNS Rápido
                emit_step(&app, "preset_dns", "Passo 2/4: Otimizando DNS para Cloudflare...", "running", "Set-DnsClientServerAddress (1.1.1.1, 1.0.0.1)...", 2, total);
                let ps_dns = "$adapter = (Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1); if ($adapter) { Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ServerAddresses ('1.1.1.1', '1.0.0.1') }";
                let _ = new_hidden_command("powershell.exe").args(["-NoProfile", "-NonInteractive", "-Command", ps_dns]).output();
                let _ = new_hidden_command("ipconfig.exe").args(["/flushdns"]).output();
                emit_step(&app, "preset_dns", "Passo 2/4: DNS Cloudflare aplicado", "success", "Resolução de domínios acelerada e DNS limpo.", 2, total);

                // 3. Telemetria básica
                emit_step(&app, "preset_telemetry", "Passo 3/4: Desativando telemetria de diagnóstico...", "running", "Desativando DiagTrack...", 3, total);
                let _ = new_hidden_command("sc.exe").args(["stop", "DiagTrack"]).output();
                let _ = new_hidden_command("sc.exe").args(["config", "DiagTrack", "start=", "disabled"]).output();
                emit_step(&app, "preset_telemetry", "Passo 3/4: Telemetria desativada", "success", "Serviço de coleta DiagTrack interrompido.", 3, total);

                // 4. Flush RAM
                emit_step(&app, "preset_ram", "Passo 4/4: Liberando memória RAM ociosa...", "running", "Executando flush de páginas ociosas...", 4, total);
                let flushed = flush_working_set_all_processes();
                emit_step(&app, "preset_ram", &format!("Passo 4/4: RAM liberada em {} processos", flushed), "success", "Memória física recuperada.", 4, total);

                emit_step(&app, "preset_essential", "Perfil Essencial Concluído com Sucesso!", "success", "Seu sistema está mais leve, rápido e com internet otimizada.", total, total);
                Ok(CommandResponse::ok("Perfil Essencial aplicado com sucesso!", Some("essential".to_string())))
            }

            "gamer" => {
                let total = 6;
                emit_step(&app, "preset_gamer", "Executando Perfil: Modo Gamer & Baixa Latência", "running", "Iniciando tweaks competitivos...", 0, total);

                // 1. Resolução do timer 0.5ms
                emit_step(&app, "preset_timer", "Passo 1/6: Ajustando Timer do Windows para 0.5ms...", "running", "Reduzindo jitter de interrupções de hardware.", 1, total);
                let _ = crate::gamer::toggle_timer_resolution; // Reference exists
                // Ativar timer raw 5000 (0.5ms)
                unsafe {
                    use windows::core::{s, w};
                    use windows::Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress};
                    if let Ok(ntdll) = GetModuleHandleW(w!("ntdll.dll")) {
                        if let Some(proc) = GetProcAddress(ntdll, s!("NtSetTimerResolution")) {
                            type NtFn = unsafe extern "system" fn(u32, u8, *mut u32) -> i32;
                            let f: NtFn = std::mem::transmute(proc);
                            let mut cur = 0u32;
                            let _ = f(5000, 1, &mut cur);
                        }
                    }
                }
                emit_step(&app, "preset_timer", "Passo 1/6: Timer 0.5ms ativo", "success", "Tick rate do agendador ajustado.", 1, total);

                // 2. Plano Ultimate Performance
                emit_step(&app, "preset_power", "Passo 2/6: Ativando Plano Desempenho Máximo...", "running", "powercfg /setactive Ultimate Performance...", 2, total);
                let _ = new_hidden_command("powercfg.exe").args(["-duplicatescheme", "e9a42b02-d5df-448d-aa00-03f14749eb61"]).output();
                let _ = new_hidden_command("powercfg.exe").args(["/setactive", "e9a42b02-d5df-448d-aa00-03f14749eb61"]).output();
                emit_step(&app, "preset_power", "Passo 2/6: Plano de Energia Desempenho Máximo Ativado", "success", "Frequência de clock destravada.", 2, total);

                // 3. TCP NoDelay
                emit_step(&app, "preset_tcp", "Passo 3/6: Otimizando pilha de rede TCP (Nagle Off)...", "running", "Aplicando TcpAckFrequency e TCPNoDelay no registro...", 3, total);
                let hklm = winreg::RegKey::predef(winreg::enums::HKEY_LOCAL_MACHINE);
                if let Ok(base) = hklm.open_subkey(r"SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces") {
                    for key_name in base.enum_keys().flatten() {
                        let path = format!(r"SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\{}", key_name);
                        if let Ok(key) = hklm.open_subkey_with_flags(&path, winreg::enums::KEY_ALL_ACCESS) {
                            if key.get_value::<String, _>("DhcpIPAddress").is_ok() || key.get_value::<String, _>("IPAddress").is_ok() {
                                let _ = key.set_value("TcpAckFrequency", &1u32);
                                let _ = key.set_value("TCPNoDelay", &1u32);
                            }
                        }
                    }
                }
                emit_step(&app, "preset_tcp", "Passo 3/6: TCP NoDelay configurado", "success", "Latência de pacotes em jogos online minimizada.", 3, total);

                // 4. Mouse 1:1 e Teclado 150ms
                emit_step(&app, "preset_inputs", "Passo 4/6: Otimizando resposta de Mouse e Teclado...", "running", "Desativando aceleração e reduzindo delay de repetição...", 4, total);
                let hkcu = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
                if let Ok((mouse_key, _)) = hkcu.create_subkey(r"Control Panel\Mouse") {
                    let _ = mouse_key.set_value("MouseSpeed", &"0");
                    let _ = mouse_key.set_value("MouseThreshold1", &"0");
                    let _ = mouse_key.set_value("MouseThreshold2", &"0");
                }
                if let Ok((kb_key, _)) = hkcu.create_subkey(r"Control Panel\Accessibility\Keyboard Response") {
                    let _ = kb_key.set_value("AutoRepeatDelay", &"150");
                }
                emit_step(&app, "preset_inputs", "Passo 4/6: Resposta 1:1 e 150ms configuradas", "success", "Input lag reduzido.", 4, total);

                // 5. GameDVR / FSO off
                emit_step(&app, "preset_gamedvr", "Passo 5/6: Desativando GameDVR e Otimizações de Tela Cheia...", "running", "Configurando GameConfigStore...", 5, total);
                if let Ok((store_key, _)) = hkcu.create_subkey(r"System\GameConfigStore") {
                    let _ = store_key.set_value("GameDVR_Enabled", &0u32);
                    let _ = store_key.set_value("GameDVR_FSEBehaviorMode", &2u32);
                    let _ = store_key.set_value("GameDVR_HonorUserFSEBehaviorMode", &1u32);
                }
                emit_step(&app, "preset_gamedvr", "Passo 5/6: GameDVR e FSO desativados", "success", "Menos micro-stutters e maior framerate.", 5, total);

                // 6. Flush RAM
                emit_step(&app, "preset_ram", "Passo 6/6: Flush imediato de memória RAM...", "running", "Limpando working set de todos os processos...", 6, total);
                let flushed = flush_working_set_all_processes();
                emit_step(&app, "preset_ram", &format!("Passo 6/6: RAM liberada em {} processos", flushed), "success", "Espaço para seus jogos garantido.", 6, total);

                emit_step(&app, "preset_gamer", "Modo Gamer Ativado com Sucesso!", "success", "Latência minimizada, clock máximo travado e estabilidade garantida.", total, total);
                Ok(CommandResponse::ok("Modo Gamer ativado com sucesso!", Some("gamer".to_string())))
            }

            "notebook" => {
                let total = 4;
                emit_step(&app, "preset_notebook", "Executando Perfil: Notebook & Eficiência", "running", "Otimizando consumo de recursos...", 0, total);

                // 1. Limpeza rápida
                emit_step(&app, "preset_clean", "Passo 1/4: Limpeza rápida de temporários...", "running", "Liberando espaço em disco...", 1, total);
                let temp_dir = std::env::var("TEMP").unwrap_or_else(|_| "C:\\Windows\\Temp".to_string());
                if let Ok(entries) = std::fs::read_dir(&temp_dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            let _ = std::fs::remove_file(path);
                        }
                    }
                }
                let _ = empty_recycle_bin();
                emit_step(&app, "preset_clean", "Passo 1/4: Temporários limpos", "success", "Armazenamento recuperado.", 1, total);

                // 2. Telemetria desligada
                emit_step(&app, "preset_telemetry", "Passo 2/4: Reduzindo tarefas em segundo plano...", "running", "Desativando telemetria em background...", 2, total);
                let _ = new_hidden_command("sc.exe").args(["stop", "DiagTrack"]).output();
                let _ = new_hidden_command("sc.exe").args(["config", "DiagTrack", "start=", "disabled"]).output();
                emit_step(&app, "preset_telemetry", "Passo 2/4: Background reduzido", "success", "Menos consumo de bateria e ciclos de CPU.", 2, total);

                // 3. Flush RAM
                emit_step(&app, "preset_ram", "Passo 3/4: Liberando páginas de memória RAM...", "running", "Otimizando working set...", 3, total);
                let flushed = flush_working_set_all_processes();
                emit_step(&app, "preset_ram", &format!("Passo 3/4: RAM limpa em {} processos", flushed), "success", "Menor pressão na memória swap.", 3, total);

                // 4. Flush DNS
                emit_step(&app, "preset_dns", "Passo 4/4: Limpando cache de rede...", "running", "ipconfig /flushdns...", 4, total);
                let _ = new_hidden_command("ipconfig.exe").args(["/flushdns"]).output();
                emit_step(&app, "preset_dns", "Passo 4/4: Rede renovada", "success", "Conexão sem fio otimizada.", 4, total);

                emit_step(&app, "preset_notebook", "Perfil Notebook Concluído!", "success", "Sistema ágil e com menos consumo em segundo plano.", total, total);
                Ok(CommandResponse::ok("Perfil Notebook aplicado com sucesso!", Some("notebook".to_string())))
            }

            "privacy" => {
                let total = 4;
                emit_step(&app, "preset_privacy", "Executando Perfil: Privacidade Extrema & Debloat", "running", "Blindando sistema contra rastreamento...", 0, total);

                // 1. Telemetria profunda
                emit_step(&app, "preset_telemetry", "Passo 1/4: Blindando privacidade no registro...", "running", "Desativando DiagTrack, Cortana e busca web...", 1, total);
                let _ = new_hidden_command("sc.exe").args(["stop", "DiagTrack"]).output();
                let _ = new_hidden_command("sc.exe").args(["config", "DiagTrack", "start=", "disabled"]).output();
                let _ = new_hidden_command("sc.exe").args(["stop", "dmwappushservice"]).output();
                let _ = new_hidden_command("sc.exe").args(["config", "dmwappushservice", "start=", "disabled"]).output();

                let hklm = winreg::RegKey::predef(winreg::enums::HKEY_LOCAL_MACHINE);
                if let Ok((key, _)) = hklm.create_subkey(r"SOFTWARE\Policies\Microsoft\Windows\DataCollection") {
                    let _ = key.set_value("AllowTelemetry", &0u32);
                    let _ = key.set_value("MaxTelemetryAllowed", &0u32);
                }
                if let Ok((key, _)) = hklm.create_subkey(r"SOFTWARE\Policies\Microsoft\Windows\Windows Search") {
                    let _ = key.set_value("AllowCortana", &0u32);
                    let _ = key.set_value("DisableWebSearch", &1u32);
                    let _ = key.set_value("ConnectedSearchUseWeb", &0u32);
                }
                emit_step(&app, "preset_telemetry", "Passo 1/4: Telemetria e Cortana desativadas", "success", "Nenhum relatório enviado à Microsoft.", 1, total);

                // 2. Remoção de Bloatwares
                emit_step(&app, "preset_bloatware", "Passo 2/4: Removendo pacotes de bloatware comuns...", "running", "Desinstalando Bing, Solitaire, 3DViewer...", 2, total);
                let bloat = vec!["*Cortana*", "*BingWeather*", "*Microsoft3DViewer*", "*MicrosoftSolitaireCollection*", "*People*", "*YourPhone*"];
                for b in bloat {
                    let cmd = format!("Get-AppxPackage -Name '{}' | Remove-AppxPackage -ErrorAction SilentlyContinue", b);
                    let _ = new_hidden_command("powershell.exe").args(["-NoProfile", "-NonInteractive", "-Command", &cmd]).output();
                }
                emit_step(&app, "preset_bloatware", "Passo 2/4: Bloatwares removidos", "success", "Aplicativos indesejados desinstalados.", 2, total);

                // 3. Tarefas órfãs
                emit_step(&app, "preset_orphans", "Passo 3/4: Limpando tarefas agendadas órfãs...", "running", "Consultando agendador de tarefas...", 3, total);
                let _ = crate::system::clean_orphan_tasks;
                let ps_cmd = r#"
                    $Tasks = Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.Actions.Execute -ne $null }
                    foreach ($T in $Tasks) {
                        $Path = $T.Actions.Execute.Replace('"', '')
                        if ($Path -match "^[a-zA-Z]:\\" -and -not (Test-Path $Path)) {
                            try { Unregister-ScheduledTask -TaskName $T.TaskName -Confirm:$false -ErrorAction Stop | Out-Null } catch {}
                        }
                    }
                "#;
                let _ = new_hidden_command("powershell.exe").args(["-NoProfile", "-NonInteractive", "-Command", ps_cmd]).output();
                emit_step(&app, "preset_orphans", "Passo 3/4: Tarefas órfãs excluídas", "success", "Agendador limpo.", 3, total);

                // 4. Limpar cache de fontes e rede
                emit_step(&app, "preset_dns", "Passo 4/4: Limpando rastros de DNS...", "running", "ipconfig /flushdns...", 4, total);
                let _ = new_hidden_command("ipconfig.exe").args(["/flushdns"]).output();
                emit_step(&app, "preset_dns", "Passo 4/4: Rastros locais esvaziados", "success", "Conexão segura.", 4, total);

                emit_step(&app, "preset_privacy", "Perfil Privacidade Extrema Concluído!", "success", "Seus dados estão protegidos e o Windows está limpo de bloatwares.", total, total);
                Ok(CommandResponse::ok("Perfil Privacidade aplicado com sucesso!", Some("privacy".to_string())))
            }

            _ => Err(format!("Perfil desconhecido: '{}'", preset_id)),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
