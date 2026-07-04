export function KeyboardShortcutsBar() {
  return (
    <div className="bg-white/90 dark:bg-black/60 backdrop-blur-xl border-t border-black/5 dark:border-white/5 px-8 py-5 flex-shrink-0 animate-slide-up">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Canvas Navigation */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[10px] font-display font-extrabold uppercase tracking-wider text-lime-dark dark:text-lime mb-1 select-none">
            Canvas Navigation
          </h4>
          <div className="flex flex-col gap-2">
            <Shortcut keys="Space + Drag" label="Pan view" />
            <Shortcut keys="Scroll / + −" label="Zoom in / out" />
            <Shortcut keys="F" label="Fit canvas to window" />
            <Shortcut keys="Middle Click" label="Pan canvas shortcut" />
          </div>
        </div>

        {/* Edit & History */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[10px] font-display font-extrabold uppercase tracking-wider text-lime-dark dark:text-lime mb-1 select-none">
            History & Selection
          </h4>
          <div className="flex flex-col gap-2">
            <Shortcut keys="Ctrl + Z" label="Undo last modification" />
            <Shortcut keys="Ctrl + Shift + Z" label="Redo modification" />
            <Shortcut keys="Left Click" label="Select SVG path to edit" />
            <Shortcut keys="Esc" label="Deselect active path" />
          </div>
        </div>

        {/* Path Actions */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[10px] font-display font-extrabold uppercase tracking-wider text-lime-dark dark:text-lime mb-1 select-none">
            Path Operations
          </h4>
          <div className="flex flex-col gap-2">
            <Shortcut keys="Swatch" label="Change path color" />
            <Shortcut keys="Slider" label="Adjust shape opacity" />
            <Shortcut keys="Duplicate" label="Clone path (shift + offset)" />
            <Shortcut keys="Delete" label="Remove path from SVG" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5 hover:translate-x-1 transition-all duration-150 cursor-default select-none group">
      <span className="font-sans text-[11px] text-ink/70 dark:text-white/70 font-semibold group-hover:text-ink dark:group-hover:text-white">
        {label}
      </span>
      <kbd className="font-mono text-[10px] text-ink dark:text-white font-bold bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded shadow-sm border border-black/5 dark:border-white/5 flex-shrink-0">
        {keys}
      </kbd>
    </div>
  );
}
