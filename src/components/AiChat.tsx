import { useEffect, useRef, useState } from 'react';
import { describeProposal, getProposalPreview } from '../ai/proposals';
import type { AiMessage, AiProviderStatus, Proposal, Work } from '../types';
import { MarkdownMessage } from './MarkdownMessage';

interface AiChatProps {
  work: Work;
  chapter: { title: string; wordCount: number; outline: string };
  messages: AiMessage[];
  providerStatus: AiProviderStatus;
  isSending: boolean;
  streamingContent?: string;
  initialInput?: string;
  onSend: (content: string) => Promise<void>;
  onCancel: () => void;
  onApplyProposal: (msgId: string, proposalId: string) => void;
  onRejectProposal: (msgId: string, proposalId: string) => void;
  onOpenSettings: () => void;
}

function ProposalCard({
  msgId,
  proposal,
  onApply,
  onReject,
}: {
  msgId: string;
  proposal: Proposal;
  onApply: (msgId: string, proposalId: string) => void;
  onReject: (msgId: string, proposalId: string) => void;
}) {
  const preview = getProposalPreview(proposal);
  const description = describeProposal(proposal);
  const statusLabel: Record<Proposal['status'], string> = {
    pending: '待审批',
    accepted: '已应用',
    rejected: '已拒绝',
    failed: '应用失败',
  };

  return (
    <div className={`proposal-card status-${proposal.status}`}>
      <div className="proposal-head">
        <span className="proposal-kind">{description}</span>
        <span className={`proposal-status status-${proposal.status}`}>{statusLabel[proposal.status]}</span>
      </div>
      {preview.before !== undefined && (
        <div className="proposal-preview">
          <div className="proposal-preview-label">原文</div>
          <div className="proposal-diff-before">{preview.before}</div>
        </div>
      )}
      <div className="proposal-preview">
        <div className="proposal-preview-label">{preview.before !== undefined ? '改为' : '内容'}</div>
        <div className="proposal-diff-after">{preview.after}</div>
      </div>
      {proposal.failureReason && (
        <div className="proposal-failure">原因：{proposal.failureReason}</div>
      )}
      {proposal.status === 'pending' && (
        <div className="proposal-actions">
          <button type="button" className="proposal-btn proposal-reject" onClick={() => onReject(msgId, proposal.id)}>拒绝</button>
          <button type="button" className="proposal-btn proposal-accept" onClick={() => onApply(msgId, proposal.id)}>应用</button>
        </div>
      )}
      {proposal.status === 'failed' && (
        <div className="proposal-actions">
          <button type="button" className="proposal-btn proposal-reject" onClick={() => onReject(msgId, proposal.id)}>忽略</button>
          <button type="button" className="proposal-btn proposal-accept" onClick={() => onApply(msgId, proposal.id)}>重试</button>
        </div>
      )}
    </div>
  );
}

export function AiChat({
  work,
  chapter,
  messages,
  providerStatus,
  isSending,
  streamingContent = '',
  initialInput = '',
  onSend,
  onCancel,
  onApplyProposal,
  onRejectProposal,
  onOpenSettings,
}: AiChatProps) {
  const [input, setInput] = useState(initialInput);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, isSending, streamingContent]);

  useEffect(() => {
    if (!initialInput) {
      return;
    }

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(initialInput.length, initialInput.length);
    });
  }, [initialInput]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending || !providerStatus.available) {
      return;
    }

    setInput('');
    await onSend(text);
  };

  const providerName = providerStatus.label;
  const isReady = providerStatus.available;

  return (
    <div className="ai-chat">
      <div className="ai-context">
        <div className="ai-context-line">
          <span>当前上下文：{work.title} / {chapter.title} / {chapter.wordCount} 字</span>
        </div>
        <div className="ai-context-line ai-context-line-secondary">
          <span className={`ai-provider-pill${isReady ? ' is-ready' : ' is-offline'}`}>
            {providerName}
          </span>
          <span>{isReady ? (providerStatus.detail || '已连接') : (providerStatus.detail || '不可用')}</span>
          <button type="button" className="ai-settings-btn" onClick={onOpenSettings}>设置</button>
        </div>
      </div>

      <div className="ai-messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="ai-welcome">
            <p>{isReady ? `${providerName} 已接入，可以开始对话。` : `${providerName} 尚未就绪，先去「设置」配置后再用。`}</p>
            <p>可以先试试这几个常用动作：</p>
            <div className="ai-suggestions">
              <button type="button" disabled={!isReady || isSending} onClick={() => void onSend('帮我续写当前段落')}>
                帮我续写
              </button>
              <button type="button" disabled={!isReady || isSending} onClick={() => void onSend('分析一下当前人物关系')}>
                分析人物
              </button>
              <button type="button" disabled={!isReady || isSending} onClick={() => void onSend('我卡文了，给我三个推进方向')}>
                我卡文了
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`ai-msg ai-msg-${msg.role}`}>
            <div className="ai-msg-role">{msg.role === 'user' ? '你' : providerName}</div>
            <MarkdownMessage content={msg.content} className="ai-msg-content" />
            {msg.proposals && msg.proposals.length > 0 && (
              <div className="proposal-list">
                {msg.proposals.map((p) => (
                  <ProposalCard
                    key={p.id}
                    msgId={msg.id}
                    proposal={p}
                    onApply={onApplyProposal}
                    onReject={onRejectProposal}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {isSending && (
          <div className="ai-msg ai-msg-assistant ai-msg-pending">
            <div className="ai-msg-role">{providerName}</div>
            <div className={`ai-msg-content${streamingContent ? ' ai-msg-stream' : ' ai-msg-thinking'}`}>
              {streamingContent || '正在思考...'}
            </div>
            <button type="button" className="ai-cancel-btn" onClick={onCancel}>取消</button>
          </div>
        )}
      </div>

      <div className="ai-input-bar">
        <textarea
          ref={inputRef}
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder={isReady ? '问我任何写作相关的问题...' : `${providerName} 当前不可用`}
          rows={2}
          disabled={!isReady || isSending}
        />
        <button className="ai-send-btn" type="button" onClick={() => void handleSend()} disabled={!isReady || isSending}>
          {isSending ? '发送中' : '发送'}
        </button>
      </div>
    </div>
  );
}
