'use client'

import { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle, useCallback } from "react";
import { ArrowUp, Loader2, Heart, Zap, LayoutGrid, Sparkles, Image as ImageIcon, Package, RefreshCw, X } from "lucide-react";
// RULE: Never use emoji characters anywhere in this file. Use lucide-react icons or unicode symbols only.
// RULE: Never use fontWeight 700 or "bold". Max weight is 600 for headings, 500 for labels, 400 for body.
import { studioSupabase } from '@/lib/supabase/studio-client';
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  attachedImages?: { dataUrl: string; base64: string; mimeType: string }[];
  actions?: { icon: string; label: string }[];
  followUps?: string[];
}

export interface ActivityMessage {
  id: string;
  type: "activity";
  action: string;
  title: string;
  description: string;
  suggestions: ActivitySuggestion[];
  timestamp: Date;
  imageThumb?: string;
}

export interface ActivitySuggestion {
  id: string;
  label: string;
  action: string;
}

type DisplayMessage = ChatMessage | ActivityMessage;

function isActivity(msg: DisplayMessage): msg is ActivityMessage {
  return "type" in msg && msg.type === "activity";
}

interface CreativeState {
  channel: string;
  heading: string;
  description: string;
  cta: string;
  style: string | null;
  product: string;
  campaign: string;
  isCarouselMode: boolean;
  textColor: string;
  ctaColor: string;
  overlayOpacity: number;
  font: string;
}

interface StudioChatPanelProps {
  creativeState: CreativeState;
  onAction: (action: any) => Promise<{ icon: string; label: string } | null>;
  onArtifactReady: () => void;
  onSuggestionAction?: (action: string) => void;
  onReferenceImageDrop?: (base64: string, mimeType: string, dataUrl: string) => void;
  onFirstMessage?: (msg: string) => void;
}

export interface StudioChatPanelRef {
  pushActivity: (
    action: string,
    title: string,
    description: string,
    suggestions: ActivitySuggestion[],
    imageThumb?: string,
  ) => void;
  sendMessage: (text: string) => void;
}

function buildSuggestions(campaign: string): string[] {
  const name = campaign || "campanha";
  return [
    `Crie um criativo para ${name} com tom emocional`,
    `Gere um carrossel de 5 slides para ${name}`,
    `Faça um banner urgência com oferta de ${name}`,
    `Crie no estilo Editorial para Instagram Feed`,
  ];
}

const chipStyle: React.CSSProperties = {
  padding: "6px 14px", borderRadius: 999,
  border: "1px solid #E8E8E8", background: "#FFFFFF",
  fontSize: 12, fontWeight: 400, color: "#555",
  cursor: "pointer", transition: "all 0.12s",
  whiteSpace: "nowrap", fontFamily: "inherit",
  display: "inline-flex", alignItems: "center", gap: 6,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

export const StudioChatPanel = forwardRef<StudioChatPanelRef, StudioChatPanelProps>(
  function StudioChatPanel({ creativeState, onAction, onArtifactReady, onSuggestionAction, onReferenceImageDrop, onFirstMessage }, ref) {
    const suggestions = useMemo(() => buildSuggestions(creativeState.campaign), [creativeState.campaign]);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [currentActionLabel, setCurrentActionLabel] = useState("");
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [attachedImages, setAttachedImages] = useState<{ dataUrl: string; base64: string; mimeType: string }[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [messages, isThinking]);

    const pushActivity = useCallback((
      action: string,
      title: string,
      description: string,
      activitySuggestions: ActivitySuggestion[],
      imageThumb?: string,
    ) => {
      const msg: ActivityMessage = {
        id: `activity-${Date.now()}`,
        type: "activity",
        action,
        title,
        description,
        suggestions: activitySuggestions,
        timestamp: new Date(),
        imageThumb,
      };
      setMessages(prev => [...prev, msg]);
    }, []);

    

    const sendMessage = async (text: string) => {
      if (!text.trim() || isThinking) return;
      if (messages.filter(m => !isActivity(m) && (m as ChatMessage).role === "user").length === 0) {
        onFirstMessage?.(text);
      }
      const currentAttached = [...attachedImages];
      const userMsg: ChatMessage = {
        role: "user", content: text,
        attachedImages: currentAttached.length > 0 ? currentAttached : undefined,
      };
      setMessages(prev => [...prev, userMsg]);
      setInputValue("");
      setAttachedImages([]);
      setIsThinking(true);
      try {
        const chatHistory = messages.filter(m => !isActivity(m)).map(m => {
          const cm = m as ChatMessage;
          if (cm.attachedImages && cm.attachedImages.length > 0) {
            return {
              role: cm.role,
              content: [
                ...cm.attachedImages.map(img => ({
                  type: "image_url" as const,
                  image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
                })),
                { type: "text" as const, text: cm.content },
              ],
            };
          }
          return { role: cm.role, content: cm.content };
        });
        // Add current message with images if any
        if (currentAttached.length > 0) {
          chatHistory.push({
            role: "user",
            content: [
              ...currentAttached.map(img => ({
                type: "image_url" as const,
                image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
              })),
              { type: "text" as const, text },
            ],
          });
        } else {
          chatHistory.push({ role: "user", content: text });
        }

        const supabase = studioSupabase; const { data, error } = await supabase.functions.invoke("studio-chat", {
          body: { messages: chatHistory, creativeState },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const result = data;
        const executedActions: { icon: string; label: string }[] = [];

        if (result.actions && Array.isArray(result.actions)) {
          for (const action of result.actions) {
            const label =
              action.type === "generate_image" ? "Gerando imagem..." :
              action.type === "generate_carousel" ? "Gerando carrossel..." :
              action.type === "set_heading" || action.type === "add_text_box" ? "Aplicando texto..." :
              action.type === "set_style" ? "Aplicando estilo..." :
              action.type === "set_channel" ? "Ajustando formato..." :
              action.type === "set_font" ? "Trocando fonte..." :
              action.type === "set_overlay_color" || action.type === "set_overlay_opacity" ? "Ajustando overlay..." :
              action.type === "add_widget" ? "Adicionando widget..." :
              "";
            if (label) setCurrentActionLabel(label);
            const executed = await onAction(action);
            if (executed) executedActions.push(executed);
          }
          if (executedActions.length > 0) onArtifactReady();
        }

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: result.message || "Pronto!",
          actions: executedActions.length > 0 ? executedActions : undefined,
          followUps: result.follow_ups ?? [],
        };
        setMessages(prev => [...prev, assistantMsg]);
      } catch (err: any) {
        console.error("Chat error:", err);
        const errorMessage = err?.message?.includes("Rate limit")
          ? "Muitas requisições. Aguarde um momento e tente novamente."
          : err?.message?.includes("Payment")
          ? "Créditos insuficientes. Adicione fundos para continuar."
          : "Não consegui processar esse pedido. Tente novamente.";
        setMessages(prev => [...prev, { role: "assistant", content: errorMessage }]);
        toast.error("Erro ao processar mensagem");
      } finally {
        setCurrentActionLabel("");
        setIsThinking(false);
      }
    };

    useImperativeHandle(ref, () => ({ pushActivity, sendMessage }), [pushActivity, sendMessage]);

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); };
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false);
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
      if (!files.length || !onReferenceImageDrop) return;
      files.slice(0, 3).forEach(file => {
        const reader = new FileReader();
        reader.onload = ev => {
          const dataUrl = ev.target?.result as string;
          const base64 = dataUrl.split(",")[1];
          onReferenceImageDrop(base64, file.type || "image/jpeg", dataUrl);
          sendMessage(`Usei essa imagem como referência visual. Gera uma imagem com esse estilo para a campanha ${creativeState.campaign}.`);
        };
        reader.readAsDataURL(file);
      });
    };

    // Map suggestion action ids to handler
    const handleChipAction = (action: string, label?: string) => {
      // Direct canvas actions
      const directActions = ["open_image_gen", "open_image_gen_with_product", "generate_lifestyle", "generate_carousel", "open_publish", "open_schedule", "open_scan", "open_calendar", "new_asset", "regenerate_image"];
      if (directActions.includes(action)) {
        onSuggestionAction?.(action);
        return;
      }
      // Send as chat message for AI to handle
      if (label) sendMessage(label);
    };

    return (
      <>
      <style>{`
        @keyframes bounceDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes chipFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
          background: "#FAFAFA",
          position: "relative",
          transition: "all 0.15s",
          outline: isDraggingOver ? "2px dashed #1A1A1A" : "2px dashed transparent",
          outlineOffset: "-4px",
        }}
      >
        {/* Drag overlay */}
        {isDraggingOver && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 50,
            background: "rgba(255,255,255,0.92)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8,
            pointerEvents: "none",
          }}>
            <ImageIcon size={32} style={{ color: "#1A1A1A" }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", margin: 0 }}>
              Solte para usar como referência
            </p>
            <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
              A imagem vai guiar a geração do criativo
            </p>
          </div>
        )}

        {/* Scroll area */}
        <div ref={scrollRef} style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}>
          {/* Welcome state */}
          {messages.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", margin: 0, lineHeight: 1.3 }}>
                  {creativeState.campaign ? `Vamos criar algo pra ${creativeState.campaign}?` : "Seu próximo post começa aqui."}
                </p>
                <p style={{ fontSize: 12, color: "#999", margin: 0, lineHeight: 1.5 }}>
                  Descreve o visual, escolhe um atalho — ou deixa a IA surpreender você.
                </p>
              </div>

              <div style={{ height: 1, background: "#F0F0F0" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#BBBBBB", textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: 0, marginBottom: 4 }}>
                  Criar agora
                </p>
                {[
                  { icon: <Sparkles size={13} />, text: "✦ Gerar imagem que para o scroll", action: "open_image_gen" },
                  { icon: <Heart size={13} />, text: "♡ Lifestyle que gera desejo", action: "generate_lifestyle" },
                  { icon: <Package size={13} />, text: "◉ Produto em cena real", action: "open_image_gen_with_product" },
                  { icon: <LayoutGrid size={13} />, text: "⊞ Carrossel que retém até o fim", action: "generate_carousel" },
                ].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => onSuggestionAction?.(s.action)}
                    className="chat-suggestion-chip-welcome"
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "9px 10px", borderRadius: 10,
                      border: "1px solid #F0F0F0", background: "transparent",
                      fontSize: 12, color: "#555", textAlign: "left" as const,
                      cursor: "pointer", transition: "all 0.12s", fontFamily: "inherit",
                      lineHeight: 1.4,
                      animation: `chipFadeIn 0.25s ease forwards`,
                      animationDelay: `${i * 80}ms`,
                      opacity: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#F7F7F7"; e.currentTarget.style.color = "#1A1A1A"; e.currentTarget.style.borderColor = "#E0E0E0"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "#F0F0F0"; }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0, display: "flex", alignItems: "center" }}>{s.icon}</span>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => {
            // Activity card
            if (isActivity(msg)) {
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    padding: "14px 16px", background: "rgba(0,0,0,0.02)",
                    borderRadius: 12, animation: "fadeInUp 0.2s ease",
                  }}>
                    {msg.imageThumb && (
                      <img
                        src={msg.imageThumb}
                        alt=""
                        onClick={() => onSuggestionAction?.(`preview_image:${msg.imageThumb}`)}
                        style={{
                          width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0,
                          cursor: "pointer", transition: "opacity 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                        title="Abrir no canvas"
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", margin: "0 0 4px 0", letterSpacing: "-0.01em" }}>{msg.title}</p>
                      <p style={{ fontSize: 13, color: "#666", lineHeight: 1.5, margin: 0, opacity: 0.75 }}>{msg.description}</p>
                    </div>
                  </div>
                  {msg.suggestions.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingLeft: 0, marginTop: 2 }}>
                      {msg.suggestions.map((s, si) => (
                        <button
                          key={s.id}
                          onClick={() => handleChipAction(s.action, s.label)}
                          className="chat-suggestion-chip"
                          style={{
                            ...chipStyle,
                            animation: `chipFadeIn 0.2s ease forwards`,
                            animationDelay: `${si * 80}ms`,
                            opacity: 0,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#1A1A1A"; e.currentTarget.style.color = "#FFF"; e.currentTarget.style.borderColor = "#1A1A1A"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#FFFFFF"; e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "#E8E8E8"; e.currentTarget.style.transform = "translateY(0)"; }}
                        >{s.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // Chat message
            const chatMsg = msg as ChatMessage;
            const isUser = chatMsg.role === "user";
            return (
              <div key={i} style={{
                display: "flex", flexDirection: "column",
                alignItems: isUser ? "flex-end" : "flex-start",
                gap: 4,
              }}>
                <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{
                    padding: "10px 14px", borderRadius: 14, fontSize: 13, lineHeight: 1.5,
                    ...(isUser
                      ? { background: "#F0F0F0", color: "#1A1A1A", borderBottomRightRadius: 4 }
                      : { background: "#FFFFFF", color: "#1A1A1A", border: "1px solid #EBEBEB", borderBottomLeftRadius: 4 }
                    ),
                  }}>
                    <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{chatMsg.content}</p>
                    {chatMsg.attachedImages && chatMsg.attachedImages.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, marginTop: 6 }}>
                        {chatMsg.attachedImages.map((img, ai) => (
                          <img key={ai} src={img.dataUrl} alt="" style={{
                            width: 60, height: 60, borderRadius: 8,
                            objectFit: "cover", border: "1px solid rgba(0,0,0,0.08)",
                          }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Executed action tags */}
                  {chatMsg.actions && chatMsg.actions.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                      {chatMsg.actions.map((action, j) => (
                        <span key={j} style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "3px 10px", borderRadius: 999,
                          background: "#F2F2F2", fontSize: 11, color: "#555",
                        }}>
                          {action.icon} {action.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Follow-up chips — only on last assistant message */}
                  {!isUser && chatMsg.followUps && chatMsg.followUps.length > 0 &&
                    i === messages.length - 1 && !isThinking && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                      {chatMsg.followUps.map((suggestion, j) => (
                        <button
                          key={j}
                          onClick={() => sendMessage(suggestion)}
                          className="chat-suggestion-chip"
                          style={{
                            ...chipStyle,
                            animation: `chipFadeIn 0.2s ease forwards`,
                            animationDelay: `${j * 80}ms`,
                            opacity: 0,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#1A1A1A"; e.currentTarget.style.color = "#FFF"; e.currentTarget.style.borderColor = "#1A1A1A"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#FFFFFF"; e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "#E8E8E8"; e.currentTarget.style.transform = "translateY(0)"; }}
                        >{suggestion}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Thinking indicator */}
          {isThinking && (
            <div style={{
              padding: "10px 16px", borderRadius: 14, borderBottomLeftRadius: 4,
              background: "#FFFFFF", border: "1px solid #EBEBEB",
              display: "inline-flex", alignItems: "center", gap: 8,
              alignSelf: "flex-start",
            }}>
              {/* Animated dots */}
              <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: 5, height: 5, borderRadius: "50%", background: "#1A1A1A",
                    animation: "bounceDot 1.2s infinite", animationDelay: `${i * 0.15}s`,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 12, color: "#888", fontWeight: 500, fontFamily: "'Inter',sans-serif" }}>
                {currentActionLabel || "Processando..."}
              </span>
            </div>
          )}
        </div>

        {/* Input area */}
        <div style={{
          padding: "12px 14px 14px",
          background: "transparent",
          flexShrink: 0,
        }}>
          <div
            style={{
              background: "#FFFFFF",
              border: `1.5px solid ${isDraggingOver ? "#1A1A1A" : "#E8E8E8"}`,
              borderRadius: 16,
              padding: "10px 12px",
              display: "flex", flexDirection: "column", gap: 8,
              boxShadow: isDraggingOver ? "0 4px 16px rgba(0,0,0,0.12)" : "0 2px 12px rgba(0,0,0,0.06)",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
            onDragLeave={e => { e.stopPropagation(); setIsDraggingOver(false); }}
            onDrop={e => {
              e.preventDefault(); e.stopPropagation();
              setIsDraggingOver(false);
              const file = e.dataTransfer.files[0];
              if (!file?.type.startsWith("image/")) return;
              const reader = new FileReader();
              reader.onload = ev => {
                const dataUrl = ev.target?.result as string;
                const base64 = dataUrl.split(",")[1];
                setAttachedImages(prev => [...prev.slice(-3), { dataUrl, base64, mimeType: file.type as "image/jpeg"|"image/png" }]);
              };
              reader.readAsDataURL(file);
            }}
            onFocusCapture={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "#CCCCCC";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
            }}
            onBlurCapture={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "#E8E8E8";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
            }}
          >
            <textarea
              ref={inputRef}
              placeholder="Descreva o que quer criar..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(inputValue); }
              }}
              rows={1}
              style={{
                width: "100%", minHeight: 36, maxHeight: 100,
                padding: 0, border: "none", outline: "none",
                fontSize: 13, color: "#1A1A1A", resize: "none",
                lineHeight: 1.5, background: "transparent",
                fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
            {/* Attached image thumbnails */}
            {attachedImages.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                {attachedImages.map((img, i) => (
                  <div key={i} style={{ position: "relative", flexShrink: 0 }}>
                    <img
                      src={img.dataUrl}
                      alt=""
                      style={{
                        width: 52, height: 52, borderRadius: 8,
                        objectFit: "cover", border: "1px solid #E8E8E8",
                        display: "block",
                      }}
                    />
                    <button
                      onClick={() => setAttachedImages(prev => prev.filter((_, j) => j !== i))}
                      style={{
                        position: "absolute", top: -4, right: -4,
                        width: 16, height: 16, borderRadius: "50%",
                        background: "#1A1A1A", border: "1.5px solid #FFF",
                        cursor: "pointer", display: "flex", alignItems: "center",
                        justifyContent: "center", padding: 0,
                      }}
                    >
                      <X size={8} style={{ color: "#FFF" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
              <button
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isThinking}
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: inputValue.trim() && !isThinking ? "#1A1A1A" : "#F0F0F0",
                  color: inputValue.trim() && !isThinking ? "#FFFFFF" : "#AAAAAA",
                  border: "none",
                  cursor: !inputValue.trim() || isThinking ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "all 0.15s",
                }}
              >
                {isThinking ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }
);
