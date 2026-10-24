"use client";

import { type ClipboardEvent, useEffect, useRef, useState } from "react";
import { pastedHtmlToPostHtml } from "@/lib/community/paste-html";

export function HtmlEditor({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [sourceMode, setSourceMode] = useState(false);
  useEffect(() => { if (!sourceMode && editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value; }, [sourceMode, value]);
  const command = (name: string, commandValue?: string) => { if (!editorRef.current || sourceMode) return; editorRef.current.focus(); document.execCommand(name, false, commandValue); onChange(editorRef.current.innerHTML); };
  const addLink = () => { const url = window.prompt("Enter a URL")?.trim(); if (url && /^(https?:\/\/|mailto:)/i.test(url)) command("createLink", url); };
  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (sourceMode) return;
    const html = event.clipboardData.getData("text/html");
    const plainText = event.clipboardData.getData("text/plain") || (html ? new DOMParser().parseFromString(html, "text/html").body.textContent ?? "" : "");
    // Copied from a page, Word or a spreadsheet, the clipboard carries the structure as
    // HTML: tables, lists, headings, links. That is rebuilt from the few tags a post can
    // hold. What has no HTML, or nothing in it, still pastes as the plain text it is.
    const richHtml = html ? pastedHtmlToPostHtml(html) : "";
    if (!richHtml && !plainText) return;
    event.preventDefault();
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) return;
    editor.focus();
    const range = selection.rangeCount ? selection.getRangeAt(0) : document.createRange();
    if (!selection.rangeCount) range.selectNodeContents(editor);
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    if (richHtml) {
      // Built above from a short list of tags and checked attributes, so it is markup the
      // editor can hold as it is.
      const holder = document.createElement("div");
      holder.innerHTML = richHtml;
      while (holder.firstChild) fragment.appendChild(holder.firstChild);
    } else {
      plainText.replace(/\r\n?/g, "\n").split("\n").forEach((line, index) => {
        if (index) fragment.appendChild(document.createElement("br"));
        fragment.appendChild(document.createTextNode(line));
      });
    }
    range.insertNode(fragment);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    onChange(editor.innerHTML);
  };
  const colors = [{ label: "Charcoal", token: "--color-ink" }, { label: "Red", token: "--color-danger" }, { label: "Orange", token: "--color-warning" }, { label: "Green", token: "--color-primary" }, { label: "Blue", token: "--blue-500" }];
  return <div className="post-editor">
    <div className="post-editor-toolbar" aria-label={`${label} formatting`}>
      <button type="button" aria-label="Undo" onMouseDown={(event) => event.preventDefault()} onClick={() => command("undo")}><i className="ms ms-rotate-left" aria-hidden="true" /></button>
      <button type="button" aria-label="Redo" onMouseDown={(event) => event.preventDefault()} onClick={() => command("redo")}><i className="ms ms-rotate-right" aria-hidden="true" /></button>
      <select aria-label="Text style" defaultValue="p" disabled={sourceMode} onChange={(event) => command("formatBlock", `<${event.target.value}>`)}><option value="p">Paragraph</option><option value="h2">Heading</option><option value="h3">Subheading</option><option value="blockquote">Quote</option></select>
      <span className="post-editor-divider" aria-hidden="true" />
      <button type="button" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => command("bold")}><strong>B</strong></button>
      <button type="button" aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => command("italic")}><em>I</em></button>
      <button type="button" aria-label="Underline" onMouseDown={(event) => event.preventDefault()} onClick={() => command("underline")}><u>U</u></button>
      <button type="button" aria-label="Strikethrough" onMouseDown={(event) => event.preventDefault()} onClick={() => command("strikeThrough")}><s>S</s></button>
      <div className="post-editor-color-palette" role="group" aria-label="Text color">{colors.map(({ label: colorLabel, token }) => <button className="post-editor-color-swatch" key={token} type="button" aria-label={`Set text color to ${colorLabel}`} disabled={sourceMode} style={{ backgroundColor: `var(${token})` }} onMouseDown={(event) => event.preventDefault()} onClick={() => command("foreColor", getComputedStyle(document.documentElement).getPropertyValue(token).trim())} />)}</div>
      <span className="post-editor-divider" aria-hidden="true" />
      <button type="button" aria-label="Bulleted list" onMouseDown={(event) => event.preventDefault()} onClick={() => command("insertUnorderedList")}><i className="ms ms-list" aria-hidden="true" /></button>
      <button type="button" aria-label="Numbered list" onMouseDown={(event) => event.preventDefault()} onClick={() => command("insertOrderedList")}><i className="ms ms-format-list-numbered" aria-hidden="true" /></button>
      <button type="button" aria-label="Insert link" onMouseDown={(event) => event.preventDefault()} onClick={addLink}><i className="ms ms-link" aria-hidden="true" /></button>
      <button type="button" aria-label="Remove formatting" onMouseDown={(event) => event.preventDefault()} onClick={() => command("removeFormat")}><i className="ms ms-ink-eraser" aria-hidden="true" /></button>
      <span className="post-editor-divider" aria-hidden="true" />
      <button className={sourceMode ? "is-active" : ""} type="button" aria-label="Edit HTML source" onClick={() => setSourceMode((current) => !current)}><i className="ms ms-code" aria-hidden="true" /></button>
    </div>
    {sourceMode ? <textarea className="post-editor-source" id={id} value={value} onChange={(event) => onChange(event.target.value)} spellCheck={false} aria-label={`${label} HTML source`} /> : <div ref={editorRef} id={id} className="post-editor-content" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder={placeholder} onInput={(event) => onChange(event.currentTarget.innerHTML)} onPaste={handlePaste} />}
  </div>;
}
