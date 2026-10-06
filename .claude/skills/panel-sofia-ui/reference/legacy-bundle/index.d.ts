import type { ReactNode } from "react";

/** Nombre de ícono al estilo Lucide. */
export type IconName = "home" | "message" | "package" | "megaphone" | "flask" | "branch" | "checklist" | "activity" | "shield" | "sliders" | "search" | "power" | "play" | "lock" | "sparkles" | "scale" | "check" | "x" | "alert" | "info" | "chevronDown" | "chevronRight" | "arrowUp" | "arrowDown" | "send" | "bold" | "list" | "smile" | "braces" | "diff" | "history" | "logout" | "panel" | "bot" | "file" | "plus" | "copy" | "eyeOff" | "upload" | "rotate" | "image" | "mic" | "sticker" | "ccheck";

export interface IconProps { name: IconName; size?: number; strokeWidth?: number; label?: string; className?: string }
export interface ButtonProps { variant?: "primary" | "secondary" | "ghost" | "danger" | "danger-outline"; size?: "md" | "sm"; icon?: IconName; iconRight?: IconName; disabled?: boolean; /** Motivo cuando el rol no permite la acción; se muestra como tooltip. */ reason?: string; onClick?: () => void; children?: ReactNode }
export interface BadgeProps { tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "ai" | "exact" | "legal" | "outline"; icon?: IconName; dot?: boolean; pulse?: boolean; title?: string; children?: ReactNode }
export interface OriginBadgeProps { kind: "ia" | "exacto" | "legal"; compact?: boolean; label?: string }
export interface VersionStatusProps { status: "borrador" | "evaluacion" | "fallida" | "lista" | "aprobada" | "publicada" | "retirada" }
export interface RobotStatusProps { status: "activo" | "detenido" | "sin-sesion" | "sin-senal"; heartbeat?: string }
export interface VariableChipProps { name: string; unknown?: boolean; locked?: boolean }
export interface SwitchProps { checked?: boolean; label?: ReactNode; disabled?: boolean; reason?: string; onChange?: () => void }
export interface TabsProps { items: { id: string; label: ReactNode; count?: number; dirty?: boolean }[]; active: string; onChange?: (id: string) => void }
export interface CardProps { title?: ReactNode; description?: ReactNode; badge?: ReactNode; actions?: ReactNode; bodyStyle?: object; children?: ReactNode }
export interface StatCardProps { label: string; value: ReactNode; delta?: string; /** false cuando subir es malo (p. ej. respuestas seguras). */ good?: boolean; alert?: boolean; icon?: IconName; hint?: string }
export interface StepperProps { steps?: string[]; current?: number; failedAt?: number }
export interface DraftBannerProps { version?: string; changes?: number }
export interface StopBannerProps { by?: string; at?: string }
export interface CalloutProps { tone?: "info" | "warning" | "danger" | "success"; icon?: IconName; children?: ReactNode }
export interface TemplateEditorProps { value: string; variables?: string[]; locked?: string[]; warning?: ReactNode; badge?: ReactNode; max?: number; minHeight?: number; footLeft?: ReactNode }
export interface WhatsAppMessage { from: "bot" | "client"; text: string; time?: string }
export interface WhatsAppPreviewProps { messages: WhatsAppMessage[]; typing?: boolean; title?: string; subtitle?: string; badge?: ReactNode; vars?: Record<string, string>; input?: boolean; placeholder?: string; height?: number }
export interface FunnelProps { steps: { label: string; value: number }[] }
export interface EmergencyStopProps { stopped?: boolean; size?: "md" | "sm" }
export interface AppShellProps { active: string; title?: ReactNode; crumbs?: ReactNode; titleBadge?: ReactNode; actions?: ReactNode; draft?: boolean; draftCount?: number; robot?: RobotStatusProps["status"]; stoppedBy?: string; stoppedAt?: string; reviewCount?: number; dirty?: string[]; user?: string; role?: string; initials?: string; version?: string; children?: ReactNode }
