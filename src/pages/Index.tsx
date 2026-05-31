import { useState, useRef, useCallback, useEffect } from "react";
import Icon from "@/components/ui/icon";

// ─── Types ───────────────────────────────────────────────────────────────────
type BlockCategory =
  | "events" | "sound" | "camera" | "files"
  | "3d" | "physics" | "postfx" | "ui" | "hardware" | "ai" | "code";

type BlockColor = { bg: string; border: string; text: string; glow: string };

interface BlockDef {
  id: string;
  category: BlockCategory;
  label: string;
  icon: string;
  description: string;
}

interface PlacedBlock {
  id: string;
  defId: string;
  x: number;
  y: number;
  connected?: string[];
  params?: Record<string, string>;
}

type Tab = "blocks" | "3d" | "ai" | "code";
type PanelTab = "categories" | "outline" | "props";

// ─── Config ──────────────────────────────────────────────────────────────────
const CATEGORY_META: Record<BlockCategory, { label: string; icon: string; color: BlockColor }> = {
  events:   { label: "События",       icon: "Zap",         color: { bg: "#1a0a2e", border: "#f59e0b", text: "#fbbf24", glow: "rgba(251,191,36,0.4)" } },
  sound:    { label: "Звук / Видео",  icon: "Music",       color: { bg: "#0a1a1a", border: "#06b6d4", text: "#22d3ee", glow: "rgba(6,182,212,0.4)" } },
  camera:   { label: "Камера",        icon: "Camera",      color: { bg: "#0a1a0a", border: "#22c55e", text: "#4ade80", glow: "rgba(34,197,94,0.4)" } },
  files:    { label: "Файлы",         icon: "FolderOpen",  color: { bg: "#1a1a0a", border: "#84cc16", text: "#a3e635", glow: "rgba(132,204,22,0.4)" } },
  "3d":     { label: "3D Объекты",    icon: "Box",         color: { bg: "#1a0a1a", border: "#a855f7", text: "#c084fc", glow: "rgba(168,85,247,0.4)" } },
  physics:  { label: "Физика",        icon: "Atom",        color: { bg: "#1a0f0a", border: "#f97316", text: "#fb923c", glow: "rgba(249,115,22,0.4)" } },
  postfx:   { label: "Пост-эффекты",  icon: "Sparkles",    color: { bg: "#1a0a14", border: "#ec4899", text: "#f472b6", glow: "rgba(236,72,153,0.4)" } },
  ui:       { label: "UI / Интерфейс",icon: "Layout",      color: { bg: "#0a0f1a", border: "#60a5fa", text: "#93c5fd", glow: "rgba(96,165,250,0.4)" } },
  hardware: { label: "Железо",        icon: "Cpu",         color: { bg: "#1a1a0a", border: "#fde047", text: "#fef08a", glow: "rgba(253,224,71,0.4)" } },
  ai:       { label: "ИИ / Нейросети",icon: "Brain",       color: { bg: "#100a1a", border: "#7c3aed", text: "#a78bfa", glow: "rgba(124,58,237,0.5)" } },
  code:     { label: "Код",           icon: "Code2",       color: { bg: "#0a1410", border: "#10b981", text: "#34d399", glow: "rgba(16,185,129,0.4)" } },
};

const BLOCK_DEFS: BlockDef[] = [
  // Events
  { id: "ev_start",     category: "events",   icon: "Play",         label: "Старт",              description: "Запускается при старте сцены" },
  { id: "ev_click",     category: "events",   icon: "MousePointer", label: "Клик на объект",     description: "При нажатии на 3D объект" },
  { id: "ev_collision", category: "events",   icon: "Zap",          label: "Столкновение",        description: "При физическом столкновении" },
  { id: "ev_wait",      category: "events",   icon: "Hourglass",    label: "Ждать",               description: "Пауза N секунд, затем сигнал" },
  { id: "ev_repeat",    category: "events",   icon: "Repeat",       label: "Повторить",           description: "Выполнить вложенные блоки N раз" },
  { id: "ev_forever",   category: "events",   icon: "Infinity",     label: "Вечно повторять",     description: "Бесконечный цикл до остановки" },
  { id: "ev_key",       category: "events",   icon: "Keyboard",     label: "Клавиша",             description: "При нажатии клавиши" },
  // Sound
  { id: "snd_note",     category: "sound",    icon: "Music",        label: "Синтез ноты",         description: "Воспроизвести ноту Web Audio" },
  { id: "snd_beat",     category: "sound",    icon: "Activity",     label: "Beat Detection",      description: "Определить ритм из аудио" },
  { id: "snd_whisper",  category: "sound",    icon: "Mic",          label: "Распознать речь",     description: "Whisper — речь в текст" },
  { id: "snd_video",    category: "sound",    icon: "Video",        label: "Видео-текстура",      description: "Видео на поверхность 3D объекта" },
  // Camera
  { id: "cam_gesture",  category: "camera",   icon: "Hand",         label: "Жест руки",           description: "Handpose — распознать жест" },
  { id: "cam_face",     category: "camera",   icon: "Smile",        label: "Лицо",                description: "Обнаружить лицо на видео" },
  { id: "cam_motion",   category: "camera",   icon: "Move",         label: "Движение",            description: "Детектор движения в кадре" },
  // Files
  { id: "fl_csv",       category: "files",    icon: "Table",        label: "Открыть CSV",         description: "Импортировать таблицу данных" },
  { id: "fl_3d",        category: "files",    icon: "Box",          label: "Загрузить 3D",        description: "Загрузить GLTF/OBJ модель" },
  { id: "fl_tex",       category: "files",    icon: "Image",        label: "Текстура",            description: "Открыть PNG/JPG текстуру" },
  // 3D
  { id: "t3_add",       category: "3d",       icon: "PlusCircle",   label: "Добавить объект",     description: "Куб, сфера, цилиндр, плоскость" },
  { id: "t3_move",      category: "3d",       icon: "Move3d",       label: "Переместить",         description: "Изменить позицию X/Y/Z" },
  { id: "t3_rotate",    category: "3d",       icon: "RotateCcw",    label: "Повернуть",           description: "Вращение по осям" },
  { id: "t3_pbr",       category: "3d",       icon: "Layers",       label: "PBR Материал",        description: "Металл, шероховатость, текстура" },
  { id: "t3_joystick",  category: "3d",       icon: "Gamepad",      label: "Джойстик",            description: "Управление объектом через стик" },
  // Physics
  { id: "ph_grav",      category: "physics",  icon: "ArrowDown",    label: "Гравитация",          description: "Включить физику объекта" },
  { id: "ph_spring",    category: "physics",  icon: "Waves",        label: "Пружина",             description: "Соединить объекты пружиной" },
  { id: "ph_fire",      category: "physics",  icon: "Flame",        label: "Огонь",               description: "Эмиттер частиц — огонь" },
  { id: "ph_rain",      category: "physics",  icon: "CloudRain",    label: "Дождь",               description: "Эмиттер частиц — дождь" },
  // PostFX
  { id: "fx_bloom",     category: "postfx",   icon: "Sparkles",     label: "Bloom",               description: "Свечение ярких областей" },
  { id: "fx_ssao",      category: "postfx",   icon: "Eye",          label: "SSAO",                description: "Ambient Occlusion в реальном времени" },
  { id: "fx_blur",      category: "postfx",   icon: "Blur",         label: "Размытие",            description: "Depth of field / motion blur" },
  // UI
  { id: "ui_text",      category: "ui",       icon: "Type",         label: "Текст",               description: "Надпись поверх 3D сцены" },
  { id: "ui_btn",       category: "ui",       icon: "Square",       label: "Кнопка",              description: "Интерактивная кнопка в UI" },
  { id: "ui_hp",        category: "ui",       icon: "Heart",        label: "Полоса жизни",        description: "Health bar с анимацией" },
  // Hardware
  { id: "hw_arduino",   category: "hardware", icon: "Cpu",          label: "Arduino",             description: "Web Serial API → COM порт" },
  { id: "hw_gamepad",   category: "hardware", icon: "Gamepad2",     label: "Геймпад",             description: "Gamepad API, оси и кнопки" },
  // AI
  { id: "ai_llm",       category: "ai",       icon: "MessageSquare",label: "Спросить LLM",        description: "Llama 3 локально — задать вопрос" },
  { id: "ai_codegen",   category: "ai",       icon: "Wand2",        label: "Сгенерировать код",   description: "LLM пишет JS/Python блок" },
  { id: "ai_melody",    category: "ai",       icon: "Piano",        label: "Мелодия AI",          description: "MusicGen — сгенерировать трек" },
  { id: "ai_texture",   category: "ai",       icon: "Image",        label: "Текстура AI",         description: "Stable Diffusion — текстура" },
  { id: "ai_shape",     category: "ai",       icon: "Shapes",       label: "3D модель AI",        description: "Shap-E — модель из текста" },
  { id: "ai_tts",       category: "ai",       icon: "Volume2",      label: "Озвучить текст",      description: "TTS — голосовой синтез" },
  // Code
  { id: "cd_js",        category: "code",     icon: "Code2",        label: "JavaScript",          description: "Вставить JS-код напрямую" },
  { id: "cd_python",    category: "code",     icon: "Terminal",     label: "Python",              description: "Pyodide — выполнить Python" },
  { id: "cd_lua",       category: "code",     icon: "FileCode",     label: "Lua",                 description: "lua.vm.js — скрипт Lua" },
];

const DEMO_BLOCKS: PlacedBlock[] = [
  { id: "b1", defId: "ev_start",   x: 80,  y: 50,  params: {} },
  { id: "b2", defId: "ev_wait",    x: 80,  y: 160, params: { seconds: "2" } },
  { id: "b3", defId: "ev_repeat",  x: 80,  y: 310, params: { times: "3" } },
  { id: "b4", defId: "ev_forever", x: 80,  y: 450, params: {} },
  { id: "b5", defId: "ai_llm",     x: 340, y: 50,  params: {} },
  { id: "b6", defId: "t3_move",    x: 340, y: 160, params: {} },
  { id: "b7", defId: "fx_bloom",   x: 340, y: 270, params: {} },
];

const OUTLINE_OBJECTS = [
  { id: "sc1", label: "Сцена",         icon: "Globe",    type: "scene",  children: [
    { id: "o1", label: "Земля",         icon: "Square",   type: "mesh" },
    { id: "o2", label: "Персонаж",      icon: "User",     type: "mesh" },
    { id: "o3", label: "Точечный свет", icon: "Sun",      type: "light" },
    { id: "o4", label: "Камера",        icon: "Camera",   type: "camera" },
    { id: "o5", label: "Частицы",       icon: "Sparkles", type: "particle" },
  ]}
];

// ─── Small Components ─────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
      <div className="relative w-8 h-8 animate-logo-pulse">
        <div className="absolute inset-0 rounded-lg gradient-brand opacity-90" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-orbitron text-white font-black text-sm leading-none">Z</span>
        </div>
        <div className="absolute -inset-1 rounded-xl gradient-brand opacity-20 blur-sm" />
      </div>
      <div>
        <div className="font-orbitron font-bold text-sm gradient-brand-text tracking-wider">ZERON</div>
        <div className="text-[9px] text-white/30 font-rubik tracking-widest uppercase">Visual IDE</div>
      </div>
    </div>
  );
}

function TopBar({ activeTab, setActiveTab }: { activeTab: Tab; setActiveTab: (t: Tab) => void }) {
  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: "blocks", icon: "LayoutGrid",  label: "Блоки" },
    { id: "3d",     icon: "Box",         label: "3D Сцена" },
    { id: "code",   icon: "Code2",       label: "Код" },
    { id: "ai",     icon: "Brain",       label: "ИИ" },
  ];

  return (
    <div className="h-12 flex items-center gap-1 px-4 border-b border-white/5" style={{ background: "rgba(10,8,20,0.95)" }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-rubik font-medium transition-all duration-200 ${
            activeTab === t.id
              ? "gradient-brand text-white shadow-lg"
              : "text-white/40 hover:text-white/70 hover:bg-white/5"
          }`}
        >
          <Icon name={t.icon} size={13} />
          {t.label}
        </button>
      ))}

      <div className="flex-1" />

      {/* Run btn */}
      <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-orbitron font-bold bg-zeron-green/20 text-zeron-green border border-zeron-green/30 hover:bg-zeron-green/30 transition-all animate-pulse-glow">
        <Icon name="Play" size={12} />
        Запуск
      </button>
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron font-bold bg-zeron-orange/15 text-zeron-orange border border-zeron-orange/25 hover:bg-zeron-orange/25 transition-all ml-1">
        <Icon name="Square" size={12} />
        Стоп
      </button>
      <div className="w-px h-6 bg-white/10 mx-2" />
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-rubik text-white/50 border border-white/10 hover:border-white/20 hover:text-white/70 transition-all">
        <Icon name="Download" size={12} />
        Экспорт
      </button>
    </div>
  );
}

function CategoryBadge({ cat, onClick, active }: { cat: BlockCategory; onClick: () => void; active: boolean }) {
  const meta = CATEGORY_META[cat];
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-rubik font-medium transition-all duration-150 w-full"
      style={{
        background: active ? meta.color.border + "22" : "transparent",
        color: active ? meta.color.text : "rgba(255,255,255,0.4)",
        border: `1px solid ${active ? meta.color.border + "60" : "transparent"}`,
        boxShadow: active ? `0 0 8px ${meta.color.glow}` : "none",
      }}
    >
      <Icon name={meta.icon} size={11} />
      {meta.label}
    </button>
  );
}

function BlockItem({ def, onDragStart }: { def: BlockDef; onDragStart: (d: BlockDef) => void }) {
  const meta = CATEGORY_META[def.category];
  return (
    <div
      draggable
      onDragStart={() => onDragStart(def)}
      className="group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-150 hover:scale-[1.01]"
      style={{
        background: meta.color.bg,
        border: `1px solid ${meta.color.border}30`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = meta.color.border + "70";
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${meta.color.glow}`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = meta.color.border + "30";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
           style={{ background: meta.color.border + "25", color: meta.color.text }}>
        <Icon name={def.icon} size={12} fallback="Box" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium font-rubik leading-none mb-0.5" style={{ color: meta.color.text }}>{def.label}</div>
        <div className="text-[9px] text-white/25 truncate leading-none">{def.description}</div>
      </div>
      <Icon name="GripVertical" size={10} className="ml-auto opacity-0 group-hover:opacity-30 flex-shrink-0" />
    </div>
  );
}

function InlineInput({ value, onChange, color, suffix }: {
  value: string; onChange: (v: string) => void; color: string; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1 mt-1.5">
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        onClick={e => e.stopPropagation()}
        className="w-14 bg-black/30 border rounded px-1.5 py-0.5 text-[11px] font-mono text-center outline-none focus:ring-1 transition-all"
        style={{ borderColor: color + "50", color, caretColor: color }}
        min="0"
      />
      {suffix && <span className="text-[10px] font-rubik" style={{ color: color + "99" }}>{suffix}</span>}
    </div>
  );
}

function CanvasBlock({ block, def, selected, onClick, onParamChange, params }: {
  block: PlacedBlock; def: BlockDef; selected: boolean; onClick: () => void;
  onParamChange?: (blockId: string, key: string, value: string) => void;
  params?: Record<string, string>;
}) {
  const meta = CATEGORY_META[def.category];
  const isWait    = def.id === "ev_wait";
  const isRepeat  = def.id === "ev_repeat";
  const isForever = def.id === "ev_forever";
  const isSpecial = isWait || isRepeat || isForever;

  return (
    <div
      className="absolute cursor-pointer select-none transition-all duration-150 animate-scale-in"
      style={{ left: block.x, top: block.y }}
      onClick={onClick}
    >
      {/* Connector notch top */}
      <div className="w-8 h-2 mx-3 rounded-t-sm" style={{ background: meta.color.border + "80" }} />

      <div
        className="rounded-xl px-3 py-2"
        style={{
          minWidth: isSpecial ? 200 : 160,
          background: meta.color.bg,
          border: `2px solid ${selected ? meta.color.border : meta.color.border + "60"}`,
          boxShadow: selected ? `0 0 20px ${meta.color.glow}, inset 0 1px 0 rgba(255,255,255,0.08)` : `0 4px 12px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Header row */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: meta.color.border + "30", color: meta.color.text }}>
            <Icon name={def.icon} size={13} fallback="Box" />
          </div>
          <span className="text-xs font-rubik font-semibold" style={{ color: meta.color.text }}>{def.label}</span>
          {selected && <Icon name="Check" size={10} className="ml-auto" style={{ color: meta.color.text }} />}
        </div>

        {/* ── Ждать ── */}
        {isWait && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-rubik" style={{ color: meta.color.text + "aa" }}>ждать</span>
              <InlineInput
                value={params?.seconds ?? "2"}
                onChange={v => onParamChange?.(block.id, "seconds", v)}
                color={meta.color.text}
                suffix="сек"
              />
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-2 h-2 rounded-full border border-current flex-shrink-0" style={{ color: meta.color.text + "60" }} />
              <span className="text-[9px] font-rubik" style={{ color: meta.color.text + "60" }}>→ затем сигнал дальше</span>
            </div>
          </div>
        )}

        {/* ── Повторить N раз ── */}
        {isRepeat && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-rubik" style={{ color: meta.color.text + "aa" }}>повторить</span>
              <InlineInput
                value={params?.times ?? "3"}
                onChange={v => onParamChange?.(block.id, "times", v)}
                color={meta.color.text}
                suffix="раз"
              />
            </div>
            {/* Loop bracket visual */}
            <div className="mt-2 ml-1 flex items-stretch gap-1.5">
              <div className="w-1 rounded-full" style={{ background: meta.color.border + "50", minHeight: 20 }} />
              <span className="text-[9px] font-rubik italic" style={{ color: meta.color.text + "50" }}>вложенные блоки...</span>
            </div>
            <div className="w-8 h-1.5 rounded-sm mt-1" style={{ background: meta.color.border + "40" }} />
          </div>
        )}

        {/* ── Вечно повторять ── */}
        {isForever && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center animate-spin-slow flex-shrink-0"
                   style={{ borderColor: meta.color.border + "70", borderTopColor: meta.color.border }}>
              </div>
              <span className="text-[10px] font-rubik" style={{ color: meta.color.text + "80" }}>∞ бесконечный цикл</span>
            </div>
            <div className="mt-2 ml-1 flex items-stretch gap-1.5">
              <div className="w-1 rounded-full" style={{ background: meta.color.border + "50", minHeight: 20 }} />
              <span className="text-[9px] font-rubik italic" style={{ color: meta.color.text + "50" }}>вложенные блоки...</span>
            </div>
            <div className="w-8 h-1.5 rounded-sm mt-1" style={{ background: meta.color.border + "40" }} />
          </div>
        )}
      </div>

      {/* Connector notch bottom */}
      <div className="w-8 h-2 mx-3 rounded-b-sm" style={{ background: meta.color.border + "80" }} />
    </div>
  );
}

interface OutlineObj { id: string; label: string; icon: string; type: string; children?: OutlineObj[]; }

function OutlineItem({ obj, depth = 0 }: { obj: OutlineObj; depth?: number }) {
  const [open, setOpen] = useState(true);
  const typeColors: Record<string, string> = {
    scene: "#a855f7", mesh: "#06b6d4", light: "#fbbf24", camera: "#22c55e", particle: "#f472b6"
  };
  const col = typeColors[obj.type] || "#ffffff";
  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer hover:bg-white/5 transition-colors group text-[11px]"
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => setOpen(!open)}
      >
        {obj.children && (
          <Icon name={open ? "ChevronDown" : "ChevronRight"} size={9} className="text-white/30" />
        )}
        {!obj.children && <div className="w-2.5" />}
        <Icon name={obj.icon} size={11} style={{ color: col }} fallback="Box" />
        <span className="font-rubik text-white/60 group-hover:text-white/80">{obj.label}</span>
        <span className="ml-auto text-[9px] px-1 py-0.5 rounded" style={{ background: col + "20", color: col }}>
          {obj.type}
        </span>
      </div>
      {open && obj.children?.map((c: OutlineObj) => <OutlineItem key={c.id} obj={c} depth={depth + 1} />)}
    </div>
  );
}

// ─── AI Model types ───────────────────────────────────────────────────────────
type ModelStatus = "ready" | "downloading" | "not_loaded";
interface LocalModel {
  id: string;
  name: string;
  desc: string;
  size: string;
  icon: string;
  color: string;
  tag: string;
  status: ModelStatus;
  progress?: number;
}

type GenTab = "chat" | "models" | "image" | "video" | "music" | "3d" | "slides";

const INITIAL_MODELS: LocalModel[] = [
  { id: "llama3",   name: "Llama 3 8B",          desc: "Чат, генерация кода, блоки",       size: "4.7 GB", icon: "MessageSquare", color: "#a855f7", tag: "LLM",      status: "ready",       progress: 100 },
  { id: "sd15",     name: "Stable Diffusion 1.5", desc: "Генерация изображений и текстур",   size: "4.2 GB", icon: "Image",         color: "#ec4899", tag: "Фото",     status: "not_loaded" },
  { id: "sdxl",     name: "SDXL Turbo",           desc: "Быстрая генерация HD-изображений",  size: "6.7 GB", icon: "Sparkles",      color: "#f472b6", tag: "Фото",     status: "not_loaded" },
  { id: "musicgen", name: "MusicGen Small",        desc: "Генерация мелодий и звуков",        size: "1.9 GB", icon: "Music",         color: "#06b6d4", tag: "Музыка",   status: "ready",       progress: 100 },
  { id: "whisper",  name: "Whisper Base",          desc: "Распознавание речи офлайн",         size: "0.1 GB", icon: "Mic",           color: "#22c55e", tag: "Речь",     status: "ready",       progress: 100 },
  { id: "shape",    name: "Shap-E",                desc: "3D модели из текстового описания",  size: "3.3 GB", icon: "Box",           color: "#fb923c", tag: "3D",       status: "not_loaded" },
  { id: "svd",      name: "Stable Video Diff.",    desc: "Генерация видео из изображения",    size: "9.1 GB", icon: "Video",         color: "#f59e0b", tag: "Видео",    status: "not_loaded" },
  { id: "animdiff", name: "AnimateDiff",           desc: "Анимация из текста/изображения",    size: "8.4 GB", icon: "Film",          color: "#ef4444", tag: "Видео",    status: "not_loaded" },
  { id: "handpose", name: "Handpose TF.js",        desc: "Распознавание жестов камера",       size: "0.2 GB", icon: "Hand",          color: "#4ade80", tag: "Камера",   status: "ready",       progress: 100 },
  { id: "yamnet",   name: "YAMNet",                desc: "Классификация звуков офлайн",       size: "0.3 GB", icon: "Volume2",       color: "#34d399", tag: "Звук",     status: "ready",       progress: 100 },
];

const STATUS_LABEL: Record<ModelStatus, string> = {
  ready: "Готова",
  downloading: "Загрузка...",
  not_loaded: "Не загружена",
};

function StatusDot({ status }: { status: ModelStatus }) {
  const colors: Record<ModelStatus, string> = { ready: "#22c55e", downloading: "#f59e0b", not_loaded: "#ffffff30" };
  return <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === "downloading" ? "animate-pulse" : ""}`} style={{ background: colors[status] }} />;
}

// ─── Generation result card ───────────────────────────────────────────────────
function GenResult({ type, prompt }: { type: string; prompt: string }) {
  const configs: Record<string, { icon: string; color: string; preview: React.ReactNode }> = {
    image: {
      icon: "Image", color: "#ec4899",
      preview: (
        <div className="w-full aspect-square rounded-lg flex items-center justify-center relative overflow-hidden"
             style={{ background: "linear-gradient(135deg, #1a0520, #2d0a3d, #1a1030)" }}>
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, #ec4899 0%, transparent 50%), radial-gradient(circle at 70% 70%, #a855f7 0%, transparent 50%)" }} />
          <div className="relative text-center">
            <Icon name="Image" size={28} className="mx-auto mb-2 text-pink-400/60" />
            <div className="text-[10px] text-white/30 font-rubik px-3">"{prompt}"</div>
          </div>
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-orbitron bg-black/50 text-pink-400">SD 1.5</div>
        </div>
      ),
    },
    video: {
      icon: "Video", color: "#f59e0b",
      preview: (
        <div className="w-full rounded-lg overflow-hidden relative" style={{ aspectRatio: "16/9", background: "linear-gradient(135deg, #1a1000, #2d1f00)" }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #f59e0b 0%, transparent 60%)" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">
              <Icon name="Play" size={16} className="text-yellow-400 ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-6 flex items-center px-2 gap-1" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-1/3 bg-yellow-400 rounded-full" /></div>
            <span className="text-[8px] text-white/40 font-orbitron">2.4s</span>
          </div>
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-orbitron bg-black/50 text-yellow-400">SVD</div>
        </div>
      ),
    },
    music: {
      icon: "Music", color: "#06b6d4",
      preview: (
        <div className="w-full rounded-lg p-3" style={{ background: "linear-gradient(135deg, #001a1a, #002d2d)" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Icon name="Music" size={14} className="text-cyan-400" />
            </div>
            <div><div className="text-[10px] font-rubik text-cyan-300 truncate max-w-[120px]">"{prompt}"</div>
              <div className="text-[9px] text-white/30">MusicGen · 30 сек</div></div>
          </div>
          <div className="flex items-center gap-0.5 h-8">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="flex-1 rounded-sm bg-cyan-500/40 animate-pulse"
                   style={{ height: `${20 + Math.sin(i * 0.7) * 15 + Math.cos(i * 1.3) * 10}%`, animationDelay: `${i * 0.05}s` }} />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center"><Icon name="Play" size={10} className="text-cyan-400 ml-0.5" /></button>
            <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-0 bg-cyan-400 rounded-full" /></div>
            <span className="text-[8px] text-white/30 font-orbitron">0:30</span>
          </div>
        </div>
      ),
    },
    "3d": {
      icon: "Box", color: "#fb923c",
      preview: (
        <div className="w-full aspect-square rounded-lg flex items-center justify-center relative overflow-hidden"
             style={{ background: "linear-gradient(135deg, #1a0a00, #2d1500)" }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #fb923c 0%, transparent 60%)" }} />
          <div className="relative flex items-center justify-center w-24 h-24 animate-spin-slow">
            <div className="absolute w-16 h-16 border-2 border-orange-400/40 rounded-sm" style={{ transform: "rotateX(45deg) rotateZ(45deg)" }} />
            <div className="absolute w-16 h-16 border-2 border-orange-300/20 rounded-sm" style={{ transform: "rotateX(45deg) rotateZ(0deg)" }} />
            <Icon name="Box" size={20} className="text-orange-400/70" />
          </div>
          <div className="absolute bottom-2 left-2 text-[9px] text-white/30 font-rubik">Shap-E · GLTF</div>
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-orbitron bg-black/50 text-orange-400">3D</div>
        </div>
      ),
    },
    slides: {
      icon: "Presentation", color: "#60a5fa",
      preview: (
        <div className="w-full rounded-lg overflow-hidden" style={{ background: "linear-gradient(135deg, #000d1a, #001a33)" }}>
          {[
            { title: prompt, sub: "Автогенерация Zeron AI", type: "title" },
            { title: "Ключевые тезисы", sub: "• Пункт первый\n• Пункт второй\n• Пункт третий", type: "content" },
            { title: "Структура", sub: "Введение → Основное → Итоги", type: "content" },
          ].map((s, i) => (
            <div key={i} className={`p-2 ${i > 0 ? "border-t border-white/5" : ""} flex items-start gap-2`}>
              <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[8px] font-orbitron"
                   style={{ background: "#60a5fa20", color: "#60a5fa", border: "1px solid #60a5fa30" }}>{i + 1}</div>
              <div>
                <div className="text-[10px] font-rubik font-semibold text-blue-300 leading-none">{s.title}</div>
                <div className="text-[9px] text-white/30 mt-0.5 whitespace-pre-line leading-tight">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  };
  const cfg = configs[type];
  if (!cfg) return null;
  return (
    <div className="animate-scale-in">
      <div className="text-[9px] font-orbitron uppercase tracking-wider mb-1.5 flex items-center gap-1" style={{ color: cfg.color }}>
        <Icon name={cfg.icon} size={9} fallback="Box" />
        Результат генерации
      </div>
      {cfg.preview}
      <div className="flex gap-1.5 mt-2">
        <button className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-rubik border transition-all hover:opacity-80"
                style={{ borderColor: cfg.color + "40", color: cfg.color, background: cfg.color + "10" }}>
          <Icon name="Download" size={9} />Скачать
        </button>
        <button className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-rubik border border-white/10 text-white/40 hover:text-white/60 transition-all">
          <Icon name="Plus" size={9} />В проект
        </button>
      </div>
    </div>
  );
}

// ─── Generation panel ─────────────────────────────────────────────────────────
function GeneratePanel({ type, modelReady }: { type: GenTab; modelReady: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(false);

  const configs: Partial<Record<GenTab, {
    title: string; icon: string; color: string; placeholder: string;
    requiredModel: string; extraFields?: React.ReactNode;
  }>> = {
    image: { title: "Генерация изображения", icon: "Image", color: "#ec4899",
      placeholder: "Опишите изображение... (напр. «огненный дракон на закате»)",
      requiredModel: "sd15",
      extraFields: (
        <div className="flex gap-2">
          {[["Размер", "512×512"], ["Стиль", "Реализм"], ["Шаги", "20"]].map(([l, v]) => (
            <div key={l} className="flex-1">
              <div className="text-[9px] text-white/30 mb-0.5 font-rubik">{l}</div>
              <div className="text-[10px] bg-white/5 border border-white/8 rounded px-2 py-1 text-white/50 font-rubik cursor-pointer hover:border-white/15 transition-colors">{v}</div>
            </div>
          ))}
        </div>
      ),
    },
    video: { title: "Генерация видео", icon: "Video", color: "#f59e0b",
      placeholder: "Опишите видео... (напр. «волны океана на рассвете»)",
      requiredModel: "svd",
      extraFields: (
        <div className="flex gap-2">
          {[["Длина", "2–4 сек"], ["FPS", "24"], ["Разм.", "512×320"]].map(([l, v]) => (
            <div key={l} className="flex-1">
              <div className="text-[9px] text-white/30 mb-0.5 font-rubik">{l}</div>
              <div className="text-[10px] bg-white/5 border border-white/8 rounded px-2 py-1 text-white/50 font-rubik">{v}</div>
            </div>
          ))}
        </div>
      ),
    },
    music: { title: "Генерация музыки", icon: "Music", color: "#06b6d4",
      placeholder: "Описание трека... (напр. «эпическая оркестровая музыка с барабанами»)",
      requiredModel: "musicgen",
      extraFields: (
        <div className="flex gap-2">
          {[["Длина", "30 сек"], ["Темп", "120 BPM"], ["Жанр", "Авто"]].map(([l, v]) => (
            <div key={l} className="flex-1">
              <div className="text-[9px] text-white/30 mb-0.5 font-rubik">{l}</div>
              <div className="text-[10px] bg-white/5 border border-white/8 rounded px-2 py-1 text-white/50 font-rubik">{v}</div>
            </div>
          ))}
        </div>
      ),
    },
    "3d": { title: "Генерация 3D модели", icon: "Box", color: "#fb923c",
      placeholder: "Опишите объект... (напр. «деревянный стул со спинкой»)",
      requiredModel: "shape",
      extraFields: (
        <div className="flex gap-2">
          {[["Формат", "GLTF"], ["Качество", "Среднее"], ["Текстура", "Да"]].map(([l, v]) => (
            <div key={l} className="flex-1">
              <div className="text-[9px] text-white/30 mb-0.5 font-rubik">{l}</div>
              <div className="text-[10px] bg-white/5 border border-white/8 rounded px-2 py-1 text-white/50 font-rubik">{v}</div>
            </div>
          ))}
        </div>
      ),
    },
    slides: { title: "Генерация презентации", icon: "Presentation", color: "#60a5fa",
      placeholder: "Тема презентации... (напр. «Введение в Python для детей»)",
      requiredModel: "llama3",
      extraFields: (
        <div className="flex gap-2">
          {[["Слайдов", "8"], ["Язык", "Русский"], ["Стиль", "Деловой"]].map(([l, v]) => (
            <div key={l} className="flex-1">
              <div className="text-[9px] text-white/30 mb-0.5 font-rubik">{l}</div>
              <div className="text-[10px] bg-white/5 border border-white/8 rounded px-2 py-1 text-white/50 font-rubik">{v}</div>
            </div>
          ))}
        </div>
      ),
    },
  };

  const cfg = configs[type];
  if (!cfg) return null;

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setResult(false);
    setTimeout(() => { setGenerating(false); setResult(true); }, 2200);
  };

  return (
    <div className="flex flex-col gap-3 p-3 h-full overflow-y-auto">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: cfg.color + "20", border: `1px solid ${cfg.color}40` }}>
          <Icon name={cfg.icon} size={14} fallback="Box" style={{ color: cfg.color }} />
        </div>
        <div>
          <div className="text-[12px] font-orbitron font-bold" style={{ color: cfg.color }}>{cfg.title}</div>
          <div className="text-[9px] text-white/30">офлайн · ONNX Runtime</div>
        </div>
        {!modelReady && (
          <div className="ml-auto text-[9px] px-2 py-0.5 rounded-full border font-rubik" style={{ borderColor: "#f59e0b40", color: "#f59e0b", background: "#f59e0b10" }}>
            Модель не загружена
          </div>
        )}
      </div>

      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder={cfg.placeholder}
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-rubik text-white/70 placeholder:text-white/20 focus:outline-none resize-none transition-colors"
        style={{ focusBorderColor: cfg.color } as React.CSSProperties}
        onFocus={e => e.target.style.borderColor = cfg.color + "60"}
        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
      />

      {cfg.extraFields}

      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || generating}
        className="w-full py-2 rounded-xl text-[11px] font-orbitron font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
        style={{ background: generating ? cfg.color + "30" : `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color}88)`, color: "#fff", border: `1px solid ${cfg.color}60` }}
      >
        {generating ? (
          <>
            <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Генерирую...
          </>
        ) : (
          <>
            <Icon name="Wand2" size={12} />
            Сгенерировать
          </>
        )}
      </button>

      {result && <GenResult type={type} prompt={prompt} />}
    </div>
  );
}

function AIPanel() {
  const [aiTab, setAiTab] = useState<GenTab>("chat");
  const [models, setModels] = useState<LocalModel[]>(INITIAL_MODELS);
  const [messages, setMessages] = useState([
    { role: "ai", text: "Привет! Я Zeron AI на базе Llama 3. Работаю полностью офлайн. Что создадим?" },
    { role: "user", text: "Сделай мне игру с физикой и персонажем" },
    { role: "ai", text: "Отличная идея! Создаю блоки: Старт → Добавить персонажа (3D куб) → Гравитация → Джойстик управления → Столкновение с землёй. Добавить ещё эффект пыли при приземлении?" },
  ]);
  const [input, setInput] = useState("");
  const [modelFilter, setModelFilter] = useState("all");
  const autocomplete = ["position.x", "rotation.y", "velocity", "microphone.volume", "sin(", "lerp("];

  const handleDownload = (id: string) => {
    setModels(prev => prev.map(m => m.id === id ? { ...m, status: "downloading", progress: 0 } : m));
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 8 + 3;
      if (p >= 100) { p = 100; clearInterval(iv);
        setModels(prev => prev.map(m => m.id === id ? { ...m, status: "ready", progress: 100 } : m));
      } else {
        setModels(prev => prev.map(m => m.id === id ? { ...m, progress: Math.round(p) } : m));
      }
    }, 300);
  };

  const tabs: { id: GenTab; icon: string; label: string; color: string }[] = [
    { id: "chat",   icon: "MessageSquare", label: "Чат",       color: "#a855f7" },
    { id: "models", icon: "Cpu",           label: "Модели",    color: "#6366f1" },
    { id: "image",  icon: "Image",         label: "Фото",      color: "#ec4899" },
    { id: "video",  icon: "Video",         label: "Видео",     color: "#f59e0b" },
    { id: "music",  icon: "Music",         label: "Музыка",    color: "#06b6d4" },
    { id: "3d",     icon: "Box",           label: "3D",        color: "#fb923c" },
    { id: "slides", icon: "Presentation",  label: "Слайды",    color: "#60a5fa" },
  ];

  const filterTags = ["all", "LLM", "Фото", "Видео", "3D", "Музыка", "Речь", "Камера", "Звук"];
  const filteredModels = models.filter(m => modelFilter === "all" || m.tag === modelFilter);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2 flex-shrink-0">
        <div className="w-6 h-6 rounded-lg gradient-brand flex items-center justify-center animate-pulse-glow">
          <Icon name="Brain" size={12} className="text-white" />
        </div>
        <div>
          <div className="text-[11px] font-orbitron font-bold text-zeron-purple">Zeron AI</div>
          <div className="text-[9px] text-white/30">
            {models.filter(m => m.status === "ready").length} моделей · офлайн
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-zeron-green animate-pulse" />
          <span className="text-[9px] text-zeron-green/70">готов</span>
        </div>
      </div>

      {/* Tab strip — scrollable */}
      <div className="flex gap-0.5 px-2 py-1.5 border-b border-white/5 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: "none" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setAiTab(t.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-rubik whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: aiTab === t.id ? t.color + "22" : "transparent",
              color: aiTab === t.id ? t.color : "rgba(255,255,255,0.35)",
              border: `1px solid ${aiTab === t.id ? t.color + "50" : "transparent"}`,
            }}>
            <Icon name={t.icon} size={10} fallback="Box" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* ── Чат ── */}
        {aiTab === "chat" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[85%] px-2.5 py-2 rounded-xl text-[11px] font-rubik leading-relaxed"
                    style={{
                      background: m.role === "ai" ? "rgba(168,85,247,0.12)" : "rgba(249,115,22,0.12)",
                      border: `1px solid ${m.role === "ai" ? "rgba(168,85,247,0.25)" : "rgba(249,115,22,0.25)"}`,
                      color: m.role === "ai" ? "#c084fc" : "#fb923c",
                    }}>{m.text}</div>
                </div>
              ))}
            </div>
            <div className="px-3 pb-1 flex flex-wrap gap-1">
              {autocomplete.map(a => (
                <button key={a} onClick={() => setInput(a)}
                  className="text-[9px] px-1.5 py-0.5 rounded border border-white/10 text-white/30 hover:text-white/60 hover:border-white/25 transition-colors font-rubik">{a}</button>
              ))}
            </div>
            <div className="px-3 pb-3 flex gap-1.5">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && input.trim()) {
                    setMessages(prev => [...prev, { role: "user", text: input }]);
                    setInput("");
                    setTimeout(() => setMessages(prev => [...prev, { role: "ai", text: "Генерирую блоки для вашего запроса..." }]), 600);
                  }
                }}
                placeholder="Спросите ИИ..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-rubik text-white/70 placeholder:text-white/20 focus:outline-none focus:border-zeron-purple/50 transition-colors" />
              <button className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0">
                <Icon name="Send" size={12} className="text-white" />
              </button>
            </div>
          </div>
        )}

        {/* ── Менеджер моделей ── */}
        {aiTab === "models" && (
          <div className="flex flex-col h-full">
            {/* Filter chips */}
            <div className="flex gap-1 px-3 pt-2 pb-1 flex-wrap flex-shrink-0">
              {filterTags.map(tag => (
                <button key={tag} onClick={() => setModelFilter(tag)}
                  className="text-[9px] px-2 py-0.5 rounded-full border font-rubik transition-all"
                  style={{
                    borderColor: modelFilter === tag ? "#a855f7" : "rgba(255,255,255,0.1)",
                    color: modelFilter === tag ? "#c084fc" : "rgba(255,255,255,0.35)",
                    background: modelFilter === tag ? "rgba(168,85,247,0.12)" : "transparent",
                  }}>
                  {tag === "all" ? "Все" : tag}
                </button>
              ))}
            </div>
            {/* Model list */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
              {filteredModels.map(m => (
                <div key={m.id} className="rounded-xl p-2.5 transition-all"
                  style={{ background: m.color + "0d", border: `1px solid ${m.color}25` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                         style={{ background: m.color + "20", border: `1px solid ${m.color}30` }}>
                      <Icon name={m.icon} size={15} fallback="Box" style={{ color: m.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-rubik font-semibold text-white/80 truncate">{m.name}</span>
                        <span className="text-[8px] px-1 py-0.5 rounded flex-shrink-0 font-orbitron"
                              style={{ background: m.color + "20", color: m.color }}>{m.tag}</span>
                      </div>
                      <div className="text-[9px] text-white/30 truncate">{m.desc}</div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-[9px] font-orbitron text-white/25">{m.size}</div>
                      <StatusDot status={m.status} />
                    </div>
                  </div>

                  {/* Progress bar */}
                  {m.status === "downloading" && (
                    <div className="mt-2">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[9px] text-white/30 font-rubik">Загрузка...</span>
                        <span className="text-[9px] font-orbitron" style={{ color: m.color }}>{m.progress}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300"
                             style={{ width: `${m.progress}%`, background: m.color }} />
                      </div>
                    </div>
                  )}

                  {/* Action */}
                  {m.status !== "downloading" && (
                    <div className="mt-2 flex gap-1.5">
                      {m.status === "not_loaded" ? (
                        <button onClick={() => handleDownload(m.id)}
                          className="flex-1 py-1 rounded-lg text-[10px] font-rubik flex items-center justify-center gap-1 transition-all hover:opacity-80"
                          style={{ background: m.color + "20", color: m.color, border: `1px solid ${m.color}40` }}>
                          <Icon name="Download" size={10} />Загрузить
                        </button>
                      ) : (
                        <>
                          <div className="flex-1 py-1 rounded-lg text-[10px] font-rubik flex items-center justify-center gap-1"
                               style={{ background: "#22c55e15", color: "#4ade80", border: "1px solid #22c55e30" }}>
                            <Icon name="Check" size={10} />
                            {STATUS_LABEL[m.status]}
                          </div>
                          <button className="px-2 py-1 rounded-lg text-[10px] border border-white/10 text-white/30 hover:text-white/50 transition-all">
                            <Icon name="Trash2" size={10} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Генерация ── */}
        {(aiTab === "image" || aiTab === "video" || aiTab === "music" || aiTab === "3d" || aiTab === "slides") && (
          <GeneratePanel
            type={aiTab}
            modelReady={models.some(m =>
              (aiTab === "image" && m.id === "sd15" && m.status === "ready") ||
              (aiTab === "video" && m.id === "svd" && m.status === "ready") ||
              (aiTab === "music" && m.id === "musicgen" && m.status === "ready") ||
              (aiTab === "3d" && m.id === "shape" && m.status === "ready") ||
              (aiTab === "slides" && m.id === "llama3" && m.status === "ready")
            )}
          />
        )}
      </div>
    </div>
  );
}

function CodeEditor() {
  const code = `// Zeron · JavaScript блок
// Подключён к: Старт → Переместить

const hero = scene.getObject("Персонаж");
const speed = 5.0;

onUpdate((delta) => {
  if (keys.isDown("ArrowRight")) {
    hero.position.x += speed * delta;
  }
  if (keys.isDown("ArrowLeft")) {
    hero.position.x -= speed * delta;
  }
  if (keys.isDown("Space") && hero.onGround) {
    hero.velocity.y = 10;
  }
});

// Автокомплит: position.x ▸ rotation.y ▸ velocity`;

  const lines = code.split("\n");

  return (
    <div className="h-full flex flex-col font-mono text-[11px]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5">
        {["JS", "Python", "Lua"].map((lang, i) => (
          <button key={lang}
            className={`px-2 py-0.5 rounded text-[10px] font-orbitron transition-all ${
              i === 0 ? "bg-zeron-green/20 text-zeron-green border border-zeron-green/30" : "text-white/30 hover:text-white/50"
            }`}>
            {lang}
          </button>
        ))}
        <div className="flex-1" />
        <button className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-white/30 hover:text-white/50 flex items-center gap-1">
          <Icon name="Wand2" size={9} />AI автодополнение
        </button>
      </div>
      {/* Code */}
      <div className="flex-1 overflow-auto p-3">
        {lines.map((line, i) => {
          const lineNum = i + 1;
          const isComment = line.trim().startsWith("//");
          const isKeyword = /\b(const|let|var|function|if|else|return|onUpdate)\b/.test(line);
          return (
            <div key={i} className="flex gap-3 group hover:bg-white/3 rounded px-1">
              <span className="text-white/15 w-5 text-right flex-shrink-0 select-none">{lineNum}</span>
              <span className={isComment ? "text-white/25" : isKeyword ? "text-zeron-purple/80" : "text-zeron-green/70"}>
                {line || " "}
              </span>
            </div>
          );
        })}
        {/* Cursor blink */}
        <div className="flex gap-3 px-1 mt-0.5">
          <span className="text-white/15 w-5 text-right flex-shrink-0">{lines.length + 1}</span>
          <span className="text-white/60 animate-[blink-cursor_1s_step-end_infinite]">|</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("blocks");
  const [panelTab, setPanelTab] = useState<PanelTab>("categories");
  const [selectedCat, setSelectedCat] = useState<BlockCategory>("events");
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [placedBlocks, setPlacedBlocks] = useState<PlacedBlock[]>(DEMO_BLOCKS);
  const [draggingDef, setDraggingDef] = useState<BlockDef | null>(null);
  const [search, setSearch] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);

  const filteredBlocks = BLOCK_DEFS.filter(b =>
    b.category === selectedCat &&
    (search === "" || b.label.toLowerCase().includes(search.toLowerCase()) || b.description.toLowerCase().includes(search.toLowerCase()))
  );

  const allSearched = search.length > 1
    ? BLOCK_DEFS.filter(b => b.label.toLowerCase().includes(search.toLowerCase()) || b.description.toLowerCase().includes(search.toLowerCase()))
    : null;

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingDef || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 80;
    const y = e.clientY - rect.top - 20;
    const defaults: Record<string, Record<string, string>> = {
      ev_wait:   { seconds: "2" },
      ev_repeat: { times: "3" },
    };
    const newBlock: PlacedBlock = {
      id: `b${Date.now()}`,
      defId: draggingDef.id,
      x: Math.max(10, x),
      y: Math.max(10, y),
      params: defaults[draggingDef.id] ?? {},
    };
    setPlacedBlocks(prev => [...prev, newBlock]);
    setDraggingDef(null);
  }, [draggingDef]);

  const handleParamChange = useCallback((blockId: string, key: string, value: string) => {
    setPlacedBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, params: { ...b.params, [key]: value } } : b
    ));
  }, []);

  const categories = Object.keys(CATEGORY_META) as BlockCategory[];

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden select-none" style={{ background: "#080614" }}>
      {/* Top bar */}
      <TopBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar ── */}
        <div className="w-[220px] flex-shrink-0 flex flex-col panel-glass animate-slide-in-left" style={{ animationDelay: "0.05s" }}>
          <Logo />

          {/* Panel tabs */}
          <div className="flex gap-0.5 p-2 border-b border-white/5">
            {(["categories", "outline", "props"] as PanelTab[]).map(t => {
              const labels: Record<PanelTab, string> = { categories: "Блоки", outline: "Сцена", props: "Св-ва" };
              const icons: Record<PanelTab, string> = { categories: "LayoutGrid", outline: "GitBranch", props: "Sliders" };
              return (
                <button key={t} onClick={() => setPanelTab(t)}
                  className={`flex-1 py-1 rounded text-[10px] font-rubik font-medium flex items-center justify-center gap-1 transition-all ${
                    panelTab === t ? "bg-zeron-purple/20 text-zeron-purple" : "text-white/30 hover:text-white/50"
                  }`}>
                  <Icon name={icons[t]} size={10} />
                  {labels[t]}
                </button>
              );
            })}
          </div>

          {panelTab === "categories" && (
            <>
              {/* Search */}
              <div className="px-2 pt-2">
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-lg px-2 py-1.5">
                  <Icon name="Search" size={11} className="text-white/30" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Поиск блоков..."
                    className="flex-1 bg-transparent text-[11px] font-rubik text-white/60 placeholder:text-white/20 outline-none"
                  />
                </div>
              </div>

              {/* Categories */}
              {!allSearched && (
                <div className="px-2 pt-2 space-y-0.5">
                  {categories.map(cat => (
                    <CategoryBadge key={cat} cat={cat} active={selectedCat === cat} onClick={() => setSelectedCat(cat)} />
                  ))}
                </div>
              )}

              {/* Block list */}
              <div className="flex-1 overflow-y-auto px-2 pt-2 pb-2 space-y-1">
                {(allSearched || filteredBlocks).map(def => (
                  <BlockItem key={def.id} def={def} onDragStart={setDraggingDef} />
                ))}
                {(allSearched || filteredBlocks).length === 0 && (
                  <div className="text-center py-6 text-white/20 text-[10px] font-rubik">Блоки не найдены</div>
                )}
              </div>
            </>
          )}

          {panelTab === "outline" && (
            <div className="flex-1 overflow-y-auto p-2">
              <div className="text-[9px] text-white/25 font-orbitron tracking-wider uppercase mb-2 px-2">Иерархия объектов</div>
              {OUTLINE_OBJECTS.map(obj => <OutlineItem key={obj.id} obj={obj} />)}
            </div>
          )}

          {panelTab === "props" && (
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              <div className="text-[9px] text-white/25 font-orbitron tracking-wider uppercase px-2 mb-1">Свойства объекта</div>
              {[
                { label: "Позиция X", value: "0.00", color: "#f87171" },
                { label: "Позиция Y", value: "1.50", color: "#4ade80" },
                { label: "Позиция Z", value: "0.00", color: "#60a5fa" },
                { label: "Масштаб",   value: "1.00", color: "#a78bfa" },
                { label: "Масса",     value: "1.00", color: "#fb923c" },
              ].map(prop => (
                <div key={prop.label} className="flex items-center gap-2 px-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: prop.color }} />
                  <span className="text-[10px] text-white/40 font-rubik w-20 flex-shrink-0">{prop.label}</span>
                  <div className="flex-1 bg-white/5 border border-white/8 rounded px-2 py-0.5 text-[10px] font-mono"
                       style={{ color: prop.color }}>{prop.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Center canvas / 3D / code / ai ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === "blocks" && (
            <div
              ref={canvasRef}
              className="flex-1 relative canvas-grid overflow-hidden"
              style={{ background: "#08061280" }}
              onDragOver={e => e.preventDefault()}
              onDrop={handleCanvasDrop}
            >
              {/* Ambient glow blobs */}
              <div className="absolute w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)", top: "10%", left: "20%" }} />
              <div className="absolute w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 70%)", bottom: "20%", right: "30%" }} />

              {/* Connection lines SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                <defs>
                  <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="rgba(168,85,247,0.4)" />
                  </marker>
                </defs>
                {/* b1→b2 */}
                <path d="M 168,95 C 168,130 168,145 168,172" stroke="rgba(251,191,36,0.35)" strokeWidth="2" fill="none" strokeDasharray="4,3" markerEnd="url(#arrow)" />
                {/* b2→b3 */}
                <path d="M 168,205 C 168,235 168,255 168,282" stroke="rgba(249,115,22,0.35)" strokeWidth="2" fill="none" strokeDasharray="4,3" markerEnd="url(#arrow)" />
                {/* b4→b5 */}
                <path d="M 408,95 C 408,130 408,145 408,172" stroke="rgba(124,58,237,0.4)" strokeWidth="2" fill="none" strokeDasharray="4,3" markerEnd="url(#arrow)" />
              </svg>

              {/* Placed blocks */}
              <div style={{ zIndex: 1, position: "relative" }}>
                {placedBlocks.map(b => {
                  const def = BLOCK_DEFS.find(d => d.id === b.defId);
                  if (!def) return null;
                  return (
                    <CanvasBlock
                      key={b.id}
                      block={b}
                      def={def}
                      selected={selectedBlock === b.id}
                      onClick={() => setSelectedBlock(selectedBlock === b.id ? null : b.id)}
                      onParamChange={handleParamChange}
                      params={b.params}
                    />
                  );
                })}
              </div>

              {/* Drop hint */}
              {draggingDef && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
                  <div className="px-6 py-3 rounded-2xl border-2 border-dashed border-zeron-purple/50 bg-zeron-purple/10 text-zeron-purple/70 text-sm font-rubik">
                    Отпустите для размещения блока
                  </div>
                </div>
              )}

              {/* Zoom controls */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-1">
                {["ZoomIn", "ZoomOut", "Maximize"].map(icon => (
                  <button key={icon} className="w-7 h-7 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 hover:border-white/20 transition-all">
                    <Icon name={icon} size={12} />
                  </button>
                ))}
              </div>

              {/* Block count badge */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 border border-white/8">
                <Icon name="LayoutGrid" size={10} className="text-zeron-purple/60" />
                <span className="text-[10px] font-orbitron text-white/40">{placedBlocks.length} блоков</span>
              </div>
            </div>
          )}

          {activeTab === "3d" && (
            <div className="flex-1 flex flex-col" style={{ background: "#060410" }}>
              {/* 3D toolbar */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5 text-[11px]">
                {[
                  { icon: "Move3d", label: "W · Перемещение", active: true },
                  { icon: "RotateCcw", label: "E · Вращение", active: false },
                  { icon: "Maximize2", label: "R · Масштаб", active: false },
                ].map(tool => (
                  <button key={tool.label}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-rubik transition-all ${
                      tool.active ? "bg-zeron-cyan/15 text-zeron-cyan border border-zeron-cyan/30" : "text-white/30 hover:text-white/60"
                    }`}>
                    <Icon name={tool.icon} size={12} />
                    <span>{tool.label}</span>
                  </button>
                ))}
                <div className="w-px h-5 bg-white/10 mx-1" />
                {["Sun", "Grid", "Eye"].map(icon => (
                  <button key={icon} className="w-7 h-7 rounded-lg text-white/30 hover:text-white/60 flex items-center justify-center hover:bg-white/5 transition-all">
                    <Icon name={icon} size={13} />
                  </button>
                ))}
                <div className="flex-1" />
                <div className="text-[10px] font-orbitron text-white/20">Three.js r160 · Cannon-es</div>
              </div>

              {/* Fake 3D viewport */}
              <div className="flex-1 relative overflow-hidden flex items-center justify-center"
                   style={{ background: "radial-gradient(ellipse at 50% 60%, #1a0a2e 0%, #06030f 70%)" }}>
                {/* Grid */}
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: "linear-gradient(rgba(168,85,247,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.3) 1px, transparent 1px)",
                  backgroundSize: "50px 50px",
                  transform: "perspective(600px) rotateX(50deg) translateY(30%)",
                  transformOrigin: "50% 100%"
                }} />

                {/* Fake 3D objects */}
                <div className="relative" style={{ width: 400, height: 300 }}>
                  {/* Ground */}
                  <div className="absolute bottom-0 left-10 right-10 h-2 rounded-sm" style={{ background: "rgba(168,85,247,0.3)", boxShadow: "0 0 20px rgba(168,85,247,0.3)" }} />
                  {/* Hero cube */}
                  <div className="absolute animate-float" style={{ bottom: 20, left: "50%", transform: "translateX(-50%)" }}>
                    <div className="w-14 h-14 rounded-lg glow-purple" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                      <div className="w-full h-full rounded-lg flex items-center justify-center">
                        <Icon name="User" size={24} className="text-white/80" />
                      </div>
                    </div>
                    <div className="w-14 h-1.5 rounded-full mt-1 mx-auto" style={{ background: "rgba(168,85,247,0.4)", filter: "blur(3px)" }} />
                  </div>
                  {/* Light sphere */}
                  <div className="absolute top-4 right-16 w-6 h-6 rounded-full glow-orange animate-pulse" style={{ background: "radial-gradient(circle, #fbbf24, #f97316)" }} />
                  {/* Particle emitter */}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="absolute w-1 h-1 rounded-full animate-float"
                      style={{
                        background: "#ec4899",
                        bottom: 30 + Math.random() * 60,
                        left: 40 + i * 18,
                        animationDelay: `${i * 0.3}s`,
                        animationDuration: `${2 + i * 0.2}s`,
                        opacity: 0.6 + Math.random() * 0.4,
                      }} />
                  ))}
                </div>

                {/* Gizmo */}
                <div className="absolute bottom-4 left-4 w-16 h-16 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center">
                  <div className="relative w-10 h-10">
                    <div className="absolute top-1/2 left-1/2 w-5 h-0.5 -translate-y-1/2 -translate-x-0" style={{ background: "#f87171", transformOrigin: "left", rotate: "0deg" }} />
                    <div className="absolute top-1/2 left-1/2 w-5 h-0.5 -translate-y-1/2 -translate-x-1/2" style={{ background: "#4ade80", rotate: "-90deg", transformOrigin: "center" }} />
                    <div className="absolute top-1/2 left-1/2 w-5 h-0.5 -translate-y-1/2 -translate-x-1/2" style={{ background: "#60a5fa", rotate: "45deg", transformOrigin: "left" }} />
                    <div className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 bg-white/60" />
                  </div>
                </div>
                <div className="absolute top-3 left-3 text-[10px] font-orbitron text-white/20">Перспектива · Y↑</div>
              </div>
            </div>
          )}

          {activeTab === "code" && (
            <div className="flex-1" style={{ background: "#050410" }}>
              <CodeEditor />
            </div>
          )}

          {activeTab === "ai" && (
            <div className="flex-1" style={{ background: "#080614" }}>
              <AIPanel />
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-[220px] flex-shrink-0 flex flex-col animate-slide-in-right"
             style={{ background: "rgba(10,8,20,0.92)", borderLeft: "1px solid rgba(168,85,247,0.1)", animationDelay: "0.1s" }}>

          {/* Stats */}
          <div className="p-3 border-b border-white/5">
            <div className="text-[9px] font-orbitron text-white/25 uppercase tracking-wider mb-2">Статус проекта</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "Блоков", value: placedBlocks.length, color: "#a855f7", icon: "LayoutGrid" },
                { label: "Объектов", value: 5, color: "#06b6d4", icon: "Box" },
                { label: "FPS", value: 60, color: "#22c55e", icon: "Gauge" },
                { label: "ИИ",  value: "готов", color: "#f97316", icon: "Brain" },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-2" style={{ background: s.color + "12", border: `1px solid ${s.color}20` }}>
                  <div className="text-[9px] text-white/30 font-rubik mb-0.5">{s.label}</div>
                  <div className="text-sm font-orbitron font-bold" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI block suggestions */}
          <div className="p-3 border-b border-white/5">
            <div className="text-[9px] font-orbitron text-white/25 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Icon name="Wand2" size={9} />
              ИИ советует
            </div>
            <div className="space-y-1">
              {[
                { label: "Добавить коллайдер",  icon: "Shield",    cat: "physics" as BlockCategory },
                { label: "Bloom на персонажа",  icon: "Sparkles",  cat: "postfx" as BlockCategory },
                { label: "Звук при столкновении",icon: "Music",   cat: "sound" as BlockCategory },
              ].map(s => {
                const meta = CATEGORY_META[s.cat];
                return (
                  <button key={s.label}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-rubik transition-all hover:scale-[1.01]"
                    style={{ background: meta.color.bg, border: `1px solid ${meta.color.border}30`, color: meta.color.text }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = meta.color.border + "60")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = meta.color.border + "30")}
                  >
                    <Icon name={s.icon} size={11} fallback="Box" />
                    {s.label}
                    <Icon name="Plus" size={9} className="ml-auto opacity-50" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick AI */}
          <div className="flex-1 p-3 overflow-y-auto">
            <div className="text-[9px] font-orbitron text-white/25 uppercase tracking-wider mb-2">Быстрые ИИ-блоки</div>
            <div className="space-y-1">
              {BLOCK_DEFS.filter(b => b.category === "ai").map(def => {
                const meta = CATEGORY_META["ai"];
                return (
                  <div key={def.id} draggable onDragStart={() => setDraggingDef(def)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab transition-all"
                    style={{ background: meta.color.bg, border: `1px solid ${meta.color.border}25` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = meta.color.border + "55"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = meta.color.border + "25"; }}>
                    <Icon name={def.icon} size={11} fallback="Box" style={{ color: meta.color.text }} />
                    <span className="text-[10px] font-rubik" style={{ color: meta.color.text }}>{def.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom links */}
          <div className="p-3 border-t border-white/5">
            <div className="flex gap-1">
              {[
                { icon: "Settings", label: "Настройки" },
                { icon: "HelpCircle", label: "Помощь" },
                { icon: "Share2", label: "Поделиться" },
              ].map(item => (
                <button key={item.label} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-all group">
                  <Icon name={item.icon} size={13} />
                  <span className="text-[8px] font-rubik">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="h-6 flex items-center gap-4 px-4 border-t border-white/5 text-[9px] font-rubik text-white/20"
           style={{ background: "rgba(5,3,12,0.95)" }}>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-zeron-green animate-pulse" />
          <span>WebLLM готов</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-zeron-cyan animate-pulse" style={{ animationDelay: "0.3s" }} />
          <span>Pyodide загружен</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-zeron-orange animate-pulse" style={{ animationDelay: "0.6s" }} />
          <span>Three.js r160</span>
        </div>
        <div className="flex-1" />
        <span>Zeron v0.1.0-alpha</span>
        <span>·</span>
        <span>Electron 28+</span>
      </div>
    </div>
  );
}