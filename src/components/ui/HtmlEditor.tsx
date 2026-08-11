"use client";

import { useEffect, useRef, useState } from "react";

export function HtmlEditor({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [sourceMode, setSourceMode] = useState(false);
  useEffect(() => { if (!sourceMode && editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value; }, [sourceMode, value]);
  const command = (name: string, commandValue?: string) => { if (!editorRef.current || sourceMode) return; editorRef.current.focus(); document.execCommand(name, false, commandValue); onChange(editorRef.current.innerHTML); };
  return <div className="post-editor">
    <div className="post-editor-toolbar" aria-label={`${label} formatting`}>
      <button type="button" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => command("bold")}><strong>B</strong></button>
      <button type="button" aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => command("italic")}><em>I</em></button>
      <button type="button" aria-label="Bulleted list" onMouseDown={(event) => event.preventDefault()} onClick={() => command("insertUnorderedList")}><i className="fa-solid fa-list" aria-hidden="true" /></button>
      <button type="button" aria-label="Numbered list" onMouseDown={(event) => event.preventDefault()} onClick={() => command("insertOrderedList")}><i className="fa-solid fa-list-ol" aria-hidden="true" /></button>
      <button className={sourceMode ? "is-active" : ""} type="button" aria-label="Edit HTML source" onClick={() => setSourceMode((current) => !current)}><i className="fa-solid fa-code" aria-hidden="true" /></button>
    </div>
    {sourceMode ? <textarea className="post-editor-source" id={id} value={value} onChange={(event) => onChange(event.target.value)} spellCheck={false} aria-label={`${label} HTML source`} /> : <div ref={editorRef} id={id} className="post-editor-content" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder={placeholder} onInput={(event) => onChange(event.currentTarget.innerHTML)} />}
  </div>;
}
