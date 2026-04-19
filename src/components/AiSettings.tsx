import { useEffect, useState } from 'react';
import { clearApiKey, hasApiKey, writeApiKey } from '../ai/registry';
import type { AiPermissionMode, AiProviderConfig, AiProviderKind } from '../types';

interface AiSettingsProps {
  config: AiProviderConfig;
  onChange: (next: AiProviderConfig) => void;
  onClose: () => void;
}

const PROVIDER_KINDS: Array<{ id: AiProviderKind; label: string; hint: string }> = [
  { id: 'codex', label: 'Codex CLI', hint: '使用本地已安装的 codex 命令（零配置）' },
  { id: 'openai_compat', label: 'OpenAI 兼容 API', hint: 'OpenAI / DeepSeek / Qwen / 中转站 · 任何兼容端点' },
];

const PERMISSION_MODES: Array<{ id: AiPermissionMode; label: string; hint: string }> = [
  { id: 'query_only', label: '只读', hint: 'AI 只能查资料，不能改任何内容' },
  { id: 'suggest', label: '建议（推荐）', hint: '每次修改都需你确认，像 code agent 的 diff 审批' },
  { id: 'auto_edit', label: '半自动', hint: '低风险（加设定/灵感）自动；改正文仍需确认' },
  { id: 'auto_all', label: '全自动', hint: 'AI 直接写，不打扰你（谨慎使用）' },
];

const PRESETS: Array<{ label: string; baseUrl: string; model: string; providerLabel: string }> = [
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', providerLabel: 'OpenAI' },
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', providerLabel: 'DeepSeek' },
  { label: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', providerLabel: 'Qwen' },
  { label: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-plus', providerLabel: '智谱' },
  { label: 'Moonshot', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', providerLabel: 'Moonshot' },
];

export function AiSettings({ config, onChange, onClose }: AiSettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStored, setApiKeyStored] = useState(false);
  const [revealKey, setRevealKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await hasApiKey();
      if (!cancelled) setApiKeyStored(stored);
    })();
    return () => { cancelled = true; };
  }, []);

  const updateCompat = (patch: Partial<AiProviderConfig['openaiCompat']>) => {
    onChange({ ...config, openaiCompat: { ...config.openaiCompat, ...patch } });
  };

  const applyPreset = (p: typeof PRESETS[number]) => {
    updateCompat({ baseUrl: p.baseUrl, model: p.model, providerLabel: p.providerLabel });
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      const ok = await writeApiKey(apiKey.trim());
      if (ok) {
        setApiKey('');
        setApiKeyStored(true);
        setMessage('已保存（系统钥匙串加密）');
      } else {
        setMessage('保存失败：桌面桥不可用');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 2500);
    }
  };

  const handleClearKey = async () => {
    if (!window.confirm('确定清除已保存的 API Key？')) return;
    await clearApiKey();
    setApiKeyStored(false);
    setMessage('已清除');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="appearance-overlay ai-settings-overlay" role="dialog" aria-modal="true" aria-label="AI 设置">
      <div className="appearance-header">
        <h2>AI 设置</h2>
        <button className="drawer-close" type="button" onClick={onClose} aria-label="关闭 AI 设置">×</button>
      </div>
      <div className="appearance-body">
        <div className="appearance-section">
          <label className="appearance-label">提供者</label>
          <div className="ai-provider-row">
            {PROVIDER_KINDS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`ai-provider-card${config.kind === p.id ? ' is-active' : ''}`}
                onClick={() => onChange({ ...config, kind: p.id })}
              >
                <span className="ai-provider-card-title">{p.label}</span>
                <span className="ai-provider-card-hint">{p.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {config.kind === 'openai_compat' && (
          <>
            <div className="appearance-section">
              <label className="appearance-label">快速预设</label>
              <div className="ai-preset-row">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className="ai-preset-chip"
                    onClick={() => applyPreset(p)}
                  >{p.label}</button>
                ))}
              </div>
            </div>

            <div className="appearance-section">
              <label className="appearance-label">服务商标签</label>
              <input
                className="ai-text-input"
                value={config.openaiCompat.providerLabel}
                onChange={(e) => updateCompat({ providerLabel: e.target.value })}
                placeholder="自定义名称（显示在对话里）"
              />
            </div>

            <div className="appearance-section">
              <label className="appearance-label">Base URL</label>
              <input
                className="ai-text-input"
                value={config.openaiCompat.baseUrl}
                onChange={(e) => updateCompat({ baseUrl: e.target.value })}
                placeholder="https://api.example.com/v1"
              />
              <div className="ai-hint">不要带尾部 /chat/completions，只到 /v1 为止</div>
            </div>

            <div className="appearance-section">
              <label className="appearance-label">模型名</label>
              <input
                className="ai-text-input"
                value={config.openaiCompat.model}
                onChange={(e) => updateCompat({ model: e.target.value })}
                placeholder="例：gpt-4o-mini / deepseek-chat / qwen-plus"
              />
            </div>

            <div className="appearance-section">
              <label className="appearance-label">Temperature</label>
              <input
                className="ai-text-input"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={config.openaiCompat.temperature}
                onChange={(e) => updateCompat({ temperature: Number(e.target.value) || 0 })}
              />
            </div>

            <div className="appearance-section">
              <label className="appearance-label">
                API Key
                {apiKeyStored && <span className="ai-key-status"> · 已保存（加密）</span>}
              </label>
              <div className="ai-key-row">
                <input
                  className="ai-text-input"
                  type={revealKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={apiKeyStored ? '已有 key，输入新 key 可覆盖' : '粘贴 API Key（仅本地加密存储）'}
                />
                <button type="button" className="ai-key-btn" onClick={() => setRevealKey((v) => !v)}>
                  {revealKey ? '隐藏' : '显示'}
                </button>
                <button type="button" className="ai-key-btn primary" disabled={!apiKey.trim() || saving} onClick={handleSaveKey}>
                  {saving ? '保存中' : '保存'}
                </button>
                {apiKeyStored && (
                  <button type="button" className="ai-key-btn danger" onClick={handleClearKey}>清除</button>
                )}
              </div>
              {message && <div className="ai-hint">{message}</div>}
            </div>
          </>
        )}

        <div className="appearance-section">
          <label className="appearance-label">权限挡位（影响 AI 能做的事）</label>
          <div className="ai-perm-list">
            {PERMISSION_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`ai-perm-row${config.permissionMode === m.id ? ' is-active' : ''}`}
                onClick={() => onChange({ ...config, permissionMode: m.id })}
              >
                <span className="ai-perm-dot" />
                <span className="ai-perm-text">
                  <span className="ai-perm-title">{m.label}</span>
                  <span className="ai-perm-hint">{m.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="ai-hint">工具调用落地（P2/P3）后此挡位生效</div>
        </div>
      </div>
    </div>
  );
}
